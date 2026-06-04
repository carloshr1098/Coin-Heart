import { createApp, ref, computed, onMounted } from 'vue';
import { createPinia } from 'pinia';
import { useGastosStore } from './store.js';

const app = createApp({
  setup() {
    const store = useGastosStore();
    const view = ref('home'); 
    const tab = ref('home'); 
    const form = ref({ concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '', edit_id: null, dia_corte: '', dia_pago: '', tarjeta_id: '', salario: '' });

    // NUEVA FUNCIÓN MÁGICA: Interceptar pagos desde Apple Shortcuts
    onMounted(() => {
      const params = new URLSearchParams(window.location.search);
      const montoAtajo = params.get('monto');
      const conceptoAtajo = params.get('concepto');
      
      if (montoAtajo) {
        // Limpiamos símbolos por si el atajo manda el signo de peso
        const montoFloat = parseFloat(montoAtajo.replace(/[^0-9.-]+/g,"")); 
        if (!isNaN(montoFloat) && montoFloat > 0) {
          const conceptoFinal = conceptoAtajo ? `Apple Pay: ${conceptoAtajo}` : 'Pago Apple Pay';
          
          // Registra el gasto automáticamente
          store.addGastoGeneral(conceptoFinal, montoFloat);
          
          // Alerta nativa para confirmarte que funcionó
          alert(`💸 Gasto Automático Registrado:\n${conceptoFinal} por $${montoFloat.toFixed(2)}`);
          
          // Limpia la URL silenciosamente para no duplicar el gasto
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    const formValido = computed(() => {
      if (view.value === 'config-salario') return form.value.salario > 0;
      if (view.value === 'add-tarjeta') return form.value.concepto && form.value.dia_corte && form.value.dia_pago;
      if (view.value === 'add-msi' || view.value === 'edit-msi') return form.value.concepto && form.value.monto && form.value.tarjeta_id;
      if (view.value === 'add-servicio') return form.value.monto && ((form.value.concepto && form.value.concepto !== 'Otro') || (form.value.concepto === 'Otro' && form.value.concepto_custom));
      if (view.value === 'pay-msi') return form.value.compromiso_id;
      if (view.value === 'pay-servicio') return form.value.servicio_id;
      return form.value.concepto && form.value.monto;
    });

    const prepararConfigSalario = () => {
      form.value.salario = store.salarioQuincenal || '';
      view.value = 'config-salario';
    };

    const prepararEdicion = (item) => {
      form.value.concepto = item.concepto;
      form.value.monto = item.monto;
      form.value.edit_id = item.id;
      view.value = 'edit-ingreso';
    };

    const prepararEdicionMSI = (item) => {
      form.value.concepto = item.concepto;
      form.value.monto = (item.monto_mensual * item.msi_totales).toFixed(2);
      form.value.msi = item.msi_totales;
      form.value.tarjeta_id = item.tarjeta_id || '';
      form.value.edit_id = item.id;
      view.value = 'edit-msi';
    };

    const prepararPagoTarjeta = (tarjeta) => {
      form.value.concepto = 'Pago Tarjeta: ' + tarjeta.nombre;
      form.value.monto = '';
      tab.value = 'home'; 
      view.value = 'add-gasto';
    };

    const guardar = () => {
      let cFinal = (view.value === 'add-servicio' && form.value.concepto === 'Otro') ? form.value.concepto_custom : form.value.concepto;
      
      if (view.value === 'config-salario') store.updateSalario(form.value.salario);
      if (view.value === 'add-ingreso') store.addIngreso(cFinal, form.value.monto);
      if (view.value === 'edit-ingreso') store.updateIngreso(form.value.edit_id, cFinal, form.value.monto);
      
      if (view.value === 'add-msi') store.addMSI(cFinal, form.value.monto, form.value.msi, form.value.tarjeta_id);
      if (view.value === 'edit-msi') store.updateMSI(form.value.edit_id, cFinal, form.value.monto, form.value.msi, form.value.tarjeta_id);

      if (view.value === 'add-servicio') store.addServicio(cFinal, form.value.monto);
      if (view.value === 'add-ahorro') store.addAhorro(cFinal, form.value.monto);
      if (view.value === 'add-gasto') store.addGastoGeneral(cFinal, form.value.monto);
      
      if (view.value === 'add-tarjeta') {
        store.addTarjeta(form.value.concepto, form.value.dia_corte, form.value.dia_pago);
        tab.value = 'tarjetas'; 
      }
      
      if (view.value === 'pay-msi' && form.value.compromiso_id) store.registrarPagoMSI(form.value.compromiso_id);
      if (view.value === 'pay-servicio' && form.value.servicio_id) store.registrarPagoServicio(form.value.servicio_id);
      
      form.value = { concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '', edit_id: null, dia_corte: '', dia_pago: '', tarjeta_id: '', salario: '' };
      
      if (view.value === 'edit-ingreso') view.value = 'manage-ingresos';
      else view.value = 'home';
    };

    const handleFileUpload = (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => { store.importarDatos(ev.target.result); view.value = 'home'; };
      reader.readAsText(e.target.files[0]);
    };

    return { store, view, tab, form, guardar, formValido, prepararConfigSalario, prepararEdicion, prepararEdicionMSI, prepararPagoTarjeta, handleFileUpload };
  }
});

app.use(createPinia());
app.mount('#app');
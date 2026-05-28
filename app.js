import { createApp, ref } from 'vue';
import { createPinia } from 'pinia';
import { useGastosStore } from './store.js';

const app = createApp({
  setup() {
    const store = useGastosStore();
    const view = ref('home'); 
    // Añadido 'edit_id' para saber qué elemento estamos editando
    const form = ref({ concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '', edit_id: null });

    // Nueva función para preparar el formulario con los datos a editar
    const prepararEdicion = (item) => {
      form.value.concepto = item.concepto;
      form.value.monto = item.monto;
      form.value.edit_id = item.id;
      view.value = 'edit-ingreso';
    };

    const guardar = () => {
      let cFinal = (view.value === 'add-servicio' && form.value.concepto === 'Otro') ? form.value.concepto_custom : form.value.concepto;
      
      if (view.value === 'add-ingreso') store.addIngreso(cFinal, form.value.monto);
      if (view.value === 'edit-ingreso') store.updateIngreso(form.value.edit_id, cFinal, form.value.monto); // Guarda la edición
      if (view.value === 'add-msi') store.addMSI(cFinal, form.value.monto, form.value.msi);
      if (view.value === 'add-servicio') store.addServicio(cFinal, form.value.monto);
      if (view.value === 'add-ahorro') store.addAhorro(cFinal, form.value.monto);
      if (view.value === 'add-gasto') store.addGastoGeneral(cFinal, form.value.monto);
      
      if (view.value === 'pay-msi' && form.value.compromiso_id) store.registrarPagoMSI(form.value.compromiso_id);
      if (view.value === 'pay-servicio' && form.value.servicio_id) store.registrarPagoServicio(form.value.servicio_id);
      
      form.value = { concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '', edit_id: null };
      
      // Si estábamos editando, nos devuelve a la lista de ingresos, si no, al home
      view.value = view.value === 'edit-ingreso' ? 'manage-ingresos' : 'home';
    };

    const handleFileUpload = (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => { store.importarDatos(ev.target.result); view.value = 'home'; };
      reader.readAsText(e.target.files[0]);
    };

    return { store, view, form, guardar, prepararEdicion, handleFileUpload };
  }
});

app.use(createPinia());
app.mount('#app');
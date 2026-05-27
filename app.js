import { createApp, ref } from 'vue';
import { createPinia } from 'pinia';
import { useGastosStore } from './store.js';

const app = createApp({
  setup() {
    const store = useGastosStore();
    const view = ref('home'); 
    const form = ref({ concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '' });

    const guardar = () => {
      let cFinal = (view.value === 'add-servicio' && form.value.concepto === 'Otro') ? form.value.concepto_custom : form.value.concepto;
      if (view.value === 'add-ingreso') store.addIngreso(cFinal, form.value.monto);
      if (view.value === 'add-msi') store.addMSI(cFinal, form.value.monto, form.value.msi);
      if (view.value === 'add-servicio') store.addServicio(cFinal, form.value.monto);
      if (view.value === 'add-ahorro') store.addAhorro(cFinal, form.value.monto);
      if (view.value === 'add-gasto') store.addGastoGeneral(cFinal, form.value.monto);
      if (view.value === 'pay-msi' && form.value.compromiso_id) store.registrarPagoMSI(form.value.compromiso_id);
      if (view.value === 'pay-servicio' && form.value.servicio_id) store.registrarPagoServicio(form.value.servicio_id);
      form.value = { concepto: '', concepto_custom: '', monto: '', msi: 12, compromiso_id: '', servicio_id: '' };
      view.value = 'home';
    };

    const handleFileUpload = (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => { store.importarDatos(ev.target.result); view.value = 'home'; };
      reader.readAsText(e.target.files[0]);
    };

    return { store, view, form, guardar, handleFileUpload };
  }
});

app.use(createPinia());
app.mount('#app');
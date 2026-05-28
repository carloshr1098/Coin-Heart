import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export const useGastosStore = defineStore('gastos', () => {
  const ingresos = ref(JSON.parse(localStorage.getItem('ch_ingresos')) || []);
  const compromisos = ref(JSON.parse(localStorage.getItem('ch_compromisos')) || []);
  const ahorros = ref(JSON.parse(localStorage.getItem('ch_ahorros')) || []);
  const gastosGenerales = ref(JSON.parse(localStorage.getItem('ch_gastos')) || []);
  const servicios = ref(JSON.parse(localStorage.getItem('ch_servicios')) || [
    { id: 1, concepto: 'Internet / Teléfono', monto: 450, pagado_este_mes: false },
    { id: 2, concepto: 'Luz (CFE)', monto: 380, pagado_este_mes: false },
    { id: 3, concepto: 'Gas', monto: 500, pagado_este_mes: false },
    { id: 4, concepto: 'Agua', monto: 150, pagado_este_mes: false },
    { id: 5, concepto: 'Netflix', monto: 249, pagado_este_mes: false },
    { id: 6, concepto: 'Spotify', monto: 149, pagado_este_mes: false }
  ]);

  const confirmandoMes = ref(false);
  const codigoConfirmacion = ref('');
  const inputConfirmacion = ref('');

  const getLocalDateISO = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date - offset)).toISOString().split('T')[0];
  };

  const hoyISO = getLocalDateISO(new Date());
  const filtroFecha = ref(hoyISO);

  const fechaMostrada = computed(() => {
    const dateObj = new Date(filtroFecha.value + 'T12:00:00'); 
    const hoyObj = new Date();
    const formato = dateObj.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    if (filtroFecha.value === getLocalDateISO(hoyObj)) return 'Hoy, ' + formato;
    const ayerObj = new Date(hoyObj);
    ayerObj.setDate(hoyObj.getDate() - 1);
    if (filtroFecha.value === getLocalDateISO(ayerObj)) return 'Ayer, ' + formato;
    return formato;
  });

  function cambiarDia(dias) {
    const current = new Date(filtroFecha.value + 'T12:00:00');
    current.setDate(current.getDate() + dias);
    filtroFecha.value = getLocalDateISO(current);
  }

  const totalIngresos = computed(() => ingresos.value.reduce((s, i) => s + i.monto, 0));
  const msiPendientes = computed(() => compromisos.value.filter(c => !c.pagado_este_mes).reduce((s, i) => s + i.monto_mensual, 0));
  const serviciosPendientes = computed(() => servicios.value.filter(s => !s.pagado_este_mes).reduce((s, i) => s + i.monto, 0));
  const pendienteMes = computed(() => msiPendientes.value + serviciosPendientes.value);
  const totalAhorrado = computed(() => ahorros.value.reduce((s, a) => s + a.monto, 0));
  const totalGastosGenerales = computed(() => gastosGenerales.value.reduce((s, g) => s + g.monto, 0));
  const disponible = computed(() => totalIngresos.value - pendienteMes.value - totalAhorrado.value - totalGastosGenerales.value);

  const gastosPorDia = computed(() => {
    const filtrados = gastosGenerales.value.filter(g => g.fecha_iso === filtroFecha.value);
    return filtrados.length ? [{ fecha: fechaMostrada.value, gastos: filtrados.slice().reverse() }] : [];
  });

  const datosGrafica = computed(() => {
    const msi = msiPendientes.value;
    const serv = serviciosPendientes.value;
    const ahorro = totalAhorrado.value;
    const diario = totalGastosGenerales.value;
    const total = msi + serv + ahorro + diario;
    if (total === 0) return 'conic-gradient(#334155 0% 100%)';
    const pD = (diario / total) * 100;
    const pM = (msi / total) * 100;
    const pS = (serv / total) * 100;
    return `conic-gradient(#f87171 0% ${pD}%, #38bdf8 ${pD}% ${pD+pM}%, #a855f7 ${pD+pM}% ${pD+pM+pS}%, #4ade80 ${pD+pM+pS}% 100%)`;
  });

  function addIngreso(c, m) { ingresos.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)) }); }
  function addMSI(c, t, m) { compromisos.value.push({ id: Date.now(), tipo: 'msi', concepto: c, monto_mensual: Number((Math.abs(Number(t))/Number(m)).toFixed(2)), pago_actual: 1, msi_totales: Number(m), pagado_este_mes: false }); }
  function addServicio(c, m) { servicios.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)), pagado_este_mes: false }); }
  function addAhorro(meta, m) { ahorros.value.push({ id: Date.now(), meta, monto: Math.abs(Number(m)) }); }
  function addGastoGeneral(c, m) { gastosGenerales.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)), fecha_iso: filtroFecha.value }); }

  function registrarPagoMSI(id) {
    const c = compromisos.value.find(x => x.id === id);
    if(c && !c.pagado_este_mes) {
      c.pagado_este_mes = true;
      addGastoGeneral('Cuota: ' + c.concepto, c.monto_mensual);
      c.pago_actual += 1;
      if(c.pago_actual > c.msi_totales) compromisos.value = compromisos.value.filter(x => x.id !== id);
    }
  }

  function registrarPagoServicio(id) {
    const s = servicios.value.find(x => x.id === id);
    if(s && !s.pagado_este_mes) {
      s.pagado_este_mes = true;
      addGastoGeneral('Servicio: ' + s.concepto, s.monto);
    }
  }

  // --- NUEVAS FUNCIONES DE INGRESOS ---
  function deleteIngreso(id) { ingresos.value = ingresos.value.filter(i => i.id !== id); }
  function updateIngreso(id, c, m) { 
    const item = ingresos.value.find(i => i.id === id); 
    if(item) { item.concepto = c; item.monto = Math.abs(Number(m)); } 
  }

  function deleteGastoGeneral(id) { gastosGenerales.value = gastosGenerales.value.filter(g => g.id !== id); }
  function deleteMSI(id) { compromisos.value = compromisos.value.filter(c => c.id !== id); }
  function deleteServicio(id) { servicios.value = servicios.value.filter(s => s.id !== id); }
  function deleteAhorro(id) { ahorros.value = ahorros.value.filter(a => a.id !== id); }
  
  function reiniciarMes() { 
    compromisos.value.forEach(c => c.pagado_este_mes = false); 
    servicios.value.forEach(s => s.pagado_este_mes = false); 
  }

  function iniciarConfirmacionMes() {
    codigoConfirmacion.value = Math.floor(100000 + Math.random() * 900000).toString();
    inputConfirmacion.value = '';
    confirmandoMes.value = true;
  }

  function ejecutarNuevoMes() {
    if (inputConfirmacion.value === codigoConfirmacion.value) {
      reiniciarMes();
      confirmandoMes.value = false;
    } else {
      alert('Código incorrecto. Verifica los números.');
    }
  }

  function exportarDatos() {
    const data = { ingresos: ingresos.value, compromisos: compromisos.value, servicios: servicios.value, ahorros: ahorros.value, gastosGenerales: gastosGenerales.value };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CoinHeart_Backup.json`; a.click();
  }

  function importarDatos(json) {
    const d = JSON.parse(json);
    ingresos.value = d.ingresos || []; compromisos.value = d.compromisos; servicios.value = d.servicios || []; ahorros.value = d.ahorros; gastosGenerales.value = d.gastosGenerales;
  }

  watch([ingresos, compromisos, servicios, ahorros, gastosGenerales], () => {
    localStorage.setItem('ch_ingresos', JSON.stringify(ingresos.value));
    localStorage.setItem('ch_compromisos', JSON.stringify(compromisos.value));
    localStorage.setItem('ch_servicios', JSON.stringify(servicios.value));
    localStorage.setItem('ch_ahorros', JSON.stringify(ahorros.value));
    localStorage.setItem('ch_gastos', JSON.stringify(gastosGenerales.value));
  }, { deep: true });

  return { 
    ingresos, compromisos, servicios, ahorros, gastosGenerales, filtroFecha, fechaMostrada, disponible, pendienteMes, msiPendientes, serviciosPendientes, totalAhorrado, totalGastosGenerales, gastosPorDia, datosGrafica,
    confirmandoMes, codigoConfirmacion, inputConfirmacion,
    cambiarDia, addIngreso, deleteIngreso, updateIngreso, addMSI, addServicio, addAhorro, addGastoGeneral, registrarPagoMSI, registrarPagoServicio, deleteGastoGeneral, deleteMSI, deleteServicio, deleteAhorro, reiniciarMes, exportarDatos, importarDatos, iniciarConfirmacionMes, ejecutarNuevoMes 
  };
});
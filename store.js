import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export const useGastosStore = defineStore('gastos', () => {
  const ingresos = ref(JSON.parse(localStorage.getItem('ch_ingresos')) || []);
  const compromisos = ref(JSON.parse(localStorage.getItem('ch_compromisos')) || []);
  const ahorros = ref(JSON.parse(localStorage.getItem('ch_ahorros')) || []);
  const gastosGenerales = ref(JSON.parse(localStorage.getItem('ch_gastos')) || []);
  const servicios = ref(JSON.parse(localStorage.getItem('ch_servicios')) || [
    { id: 1, concepto: 'Internet / Teléfono', monto: 450, pagado_este_mes: false },
    { id: 2, concepto: 'Luz (CFE)', monto: 380, pagado_este_mes: false }
  ]);
  const tarjetas = ref(JSON.parse(localStorage.getItem('ch_tarjetas')) || []);
  
  // NUEVO: Variable para el salario quincenal
  const salarioQuincenal = ref(JSON.parse(localStorage.getItem('ch_salario')) || 0);

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

  const diasRestantesMes = computed(() => {
      const hoy = new Date();
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      return ultimoDia - hoy.getDate() + 1;
  });

  const presupuestoDiario = computed(() => {
      return disponible.value > 0 ? (disponible.value / diasRestantesMes.value) : 0;
  });

  // NUEVO: Proyecciones Mensuales
  const totalCompromisosMes = computed(() => {
    const msi = compromisos.value.reduce((s, c) => s + c.monto_mensual, 0);
    const serv = servicios.value.reduce((s, x) => s + x.monto, 0);
    return msi + serv;
  });

  const libreProyectado = computed(() => {
    return (salarioQuincenal.value * 2) - totalCompromisosMes.value;
  });

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

  const estadoTarjetas = computed(() => {
    const hoy = new Date();
    const diaHoy = hoy.getDate();
    return tarjetas.value.map(t => {
      let mesPago = hoy.getMonth();
      let añoPago = hoy.getFullYear();
      if (diaHoy > t.dia_pago) { mesPago += 1; }
      const proximoPago = new Date(añoPago, mesPago, t.dia_pago);
      const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const diffDays = Math.ceil((proximoPago - hoyCero) / (1000 * 60 * 60 * 24));
      
      let estado = 'ok', mensaje = '';
      if (diffDays <= 5) { estado = 'urgente'; mensaje = `¡Paga en ${diffDays} día(s)!`; } 
      else if (diffDays <= 15) { estado = 'pendiente'; mensaje = `Límite en ${diffDays} días`; } 
      else { estado = 'lejos'; mensaje = `Límite el día ${t.dia_pago}`; }
      
      return { ...t, diasParaPago: diffDays, estado, mensaje };
    }).sort((a, b) => a.diasParaPago - b.diasParaPago);
  });

  function addIngreso(c, m) { ingresos.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)) }); }
  
  // NUEVO: Funciones para Salario
  function updateSalario(monto) { salarioQuincenal.value = Math.abs(Number(monto)); }
  function cobrarQuincena() {
    if(salarioQuincenal.value > 0) {
      addIngreso('Pago de Quincena', salarioQuincenal.value);
      alert('¡Quincena registrada con éxito! 💸\nTu Disponible Real ha aumentado.');
    }
  }

  function addMSI(c, t, m, tarjeta_id) { compromisos.value.push({ id: Date.now(), tipo: 'msi', concepto: c, monto_mensual: Number((Math.abs(Number(t))/Number(m)).toFixed(2)), pago_actual: 1, msi_totales: Number(m), pagado_este_mes: false, tarjeta_id: tarjeta_id }); }
  function updateMSI(id, c, t, m, tarjeta_id) {
    const item = compromisos.value.find(i => i.id === id);
    if(item) {
      item.concepto = c;
      item.monto_mensual = Number((Math.abs(Number(t))/Number(m)).toFixed(2));
      item.msi_totales = Number(m);
      item.tarjeta_id = tarjeta_id;
    }
  }

  function addServicio(c, m) { servicios.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)), pagado_este_mes: false }); }
  function addAhorro(meta, m) { ahorros.value.push({ id: Date.now(), meta, monto: Math.abs(Number(m)) }); }
  function addGastoGeneral(c, m) { gastosGenerales.value.push({ id: Date.now(), concepto: c, monto: Math.abs(Number(m)), fecha_iso: filtroFecha.value }); }
  function addTarjeta(n, corte, pago) { tarjetas.value.push({ id: Date.now(), nombre: n, dia_corte: Number(corte), dia_pago: Number(pago) }); }
  function deleteTarjeta(id) { tarjetas.value = tarjetas.value.filter(t => t.id !== id); }

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
  function iniciarConfirmacionMes() { codigoConfirmacion.value = Math.floor(100000 + Math.random() * 900000).toString(); inputConfirmacion.value = ''; confirmandoMes.value = true; }
  function ejecutarNuevoMes() { if (inputConfirmacion.value === codigoConfirmacion.value) { reiniciarMes(); confirmandoMes.value = false; } else { alert('Código incorrecto. Verifica los números.'); } }

  function exportarDatos() {
    const data = { ingresos: ingresos.value, compromisos: compromisos.value, servicios: servicios.value, ahorros: ahorros.value, gastosGenerales: gastosGenerales.value, tarjetas: tarjetas.value, salarioQuincenal: salarioQuincenal.value };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CoinHeart_Backup.json`; a.click();
  }

  function importarDatos(json) {
    const d = JSON.parse(json);
    ingresos.value = d.ingresos || []; compromisos.value = d.compromisos || []; servicios.value = d.servicios || []; ahorros.value = d.ahorros || []; gastosGenerales.value = d.gastosGenerales || []; tarjetas.value = d.tarjetas || []; salarioQuincenal.value = d.salarioQuincenal || 0;
  }

  watch([ingresos, compromisos, servicios, ahorros, gastosGenerales, tarjetas, salarioQuincenal], () => {
    localStorage.setItem('ch_ingresos', JSON.stringify(ingresos.value));
    localStorage.setItem('ch_compromisos', JSON.stringify(compromisos.value));
    localStorage.setItem('ch_servicios', JSON.stringify(servicios.value));
    localStorage.setItem('ch_ahorros', JSON.stringify(ahorros.value));
    localStorage.setItem('ch_gastos', JSON.stringify(gastosGenerales.value));
    localStorage.setItem('ch_tarjetas', JSON.stringify(tarjetas.value));
    localStorage.setItem('ch_salario', JSON.stringify(salarioQuincenal.value));
  }, { deep: true });

  return { 
    ingresos, compromisos, servicios, ahorros, gastosGenerales, tarjetas, filtroFecha, fechaMostrada, disponible, pendienteMes, msiPendientes, serviciosPendientes, totalAhorrado, totalGastosGenerales, gastosPorDia, datosGrafica, estadoTarjetas,
    salarioQuincenal, diasRestantesMes, presupuestoDiario, totalCompromisosMes, libreProyectado, // Nuevas exportaciones
    confirmandoMes, codigoConfirmacion, inputConfirmacion,
    cambiarDia, addIngreso, deleteIngreso, updateIngreso, updateSalario, cobrarQuincena, addMSI, updateMSI, addServicio, addAhorro, addGastoGeneral, addTarjeta, deleteTarjeta, registrarPagoMSI, registrarPagoServicio, deleteGastoGeneral, deleteMSI, deleteServicio, deleteAhorro, reiniciarMes, exportarDatos, importarDatos, iniciarConfirmacionMes, ejecutarNuevoMes 
  };
});
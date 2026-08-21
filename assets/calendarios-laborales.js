(function (global) {
  'use strict';

  const VERSION = '2026-08-21';
  const ANO_CALENDARIO = 2026;
  const FUENTE_CALENDARIO_2026 = 'BOE-A-2025-21667';
  const FUENTE_CALENDARIO_2027 = 'fuente territorial oficial o referencia provisional · revisión 21-08-2026';
  const REFERENCIA_PROVISIONAL_2027 = 'https://calendarioslaborales.com/calendarios-laborales-2027-por-comunidades-autonomas.htm';
  const FUENTE_BOE_2026 = 'https://www.boe.es/buscar/doc.php?id=BOE-A-2025-21667';
  const FUENTE_BOE_MARCO = 'https://www.boe.es/buscar/act.php?id=BOE-A-1983-20906';

  const TODAS_REGIONES = ['andalucia','aragon','asturias','baleares','canarias','cantabria','castilla_mancha','castilla_leon','cataluna','extremadura','galicia','madrid','murcia','navarra','pais_vasco','rioja','valenciana','ceuta','melilla'];
  const NOMBRES_REGIONES = {
    espana:'España', andalucia:'Andalucía', aragon:'Aragón', asturias:'Asturias', baleares:'Illes Balears', canarias:'Canarias', cantabria:'Cantabria', castilla_mancha:'Castilla-La Mancha', castilla_leon:'Castilla y León', cataluna:'Cataluña', extremadura:'Extremadura', galicia:'Galicia', madrid:'Comunidad de Madrid', murcia:'Región de Murcia', navarra:'Navarra', pais_vasco:'País Vasco', rioja:'La Rioja', valenciana:'Comunitat Valenciana', ceuta:'Ceuta', melilla:'Melilla'
  };

  const METADATOS_CALENDARIO_2026 = Object.fromEntries(['espana', ...TODAS_REGIONES].map(region => [region, {
    official:true,
    provisional:false,
    source:'BOE · Resolución de 17 de octubre de 2025 · BOE-A-2025-21667',
    sourceUrl:FUENTE_BOE_2026
  }]));

  const METADATOS_CALENDARIO_2027 = {
    espana: { official:true, provisional:false, source:'BOE · marco legal de fiestas laborales comunes', sourceUrl:FUENTE_BOE_MARCO },
    andalucia: { official:true, provisional:false, source:'BOJA · Decreto 84/2026, de 29 de abril', sourceUrl:'https://www.juntadeandalucia.es/boja/2026/84/1' },
    aragon: { official:false, provisional:true, source:'Referencia provisional no oficial · pendiente de publicación en el BOA', sourceUrl:REFERENCIA_PROVISIONAL_2027 },
    asturias: { official:false, provisional:true, source:'Referencia provisional no oficial · pendiente del calendario autonómico general en el BOPA', sourceUrl:REFERENCIA_PROVISIONAL_2027 },
    baleares: { official:true, provisional:false, source:'BOIB · Acuerdo del Consell de Govern de 13 de marzo de 2026', sourceUrl:'https://www.caib.es/eboibfront/pdf/ca/2026/83/1223137' },
    canarias: { official:true, provisional:false, source:'BOC · Decreto 115/2026, de 29 de junio', sourceUrl:'https://www.gobiernodecanarias.org/boc/archivo/2026/133/pda/2334.html' },
    cantabria: { official:true, provisional:false, source:'BOC · Orden IND/29/2026, de 6 de julio · CVE-2026-5673', sourceUrl:'https://boc.cantabria.es/boces/' },
    castilla_mancha: { official:true, provisional:false, source:'DOCM · Decreto 34/2026, de 23 de junio', sourceUrl:'https://transparencia.castillalamancha.es/actuacion/decreto-342026-de-23-de-junio-por-el-que-se-fija-el-calendario-laboral-para-el-ano-2027' },
    castilla_leon: { official:true, provisional:false, source:'BOCYL · Decreto 7/2026, de 26 de marzo', sourceUrl:'https://bocyl.jcyl.es/boletin.do?fechaBoletin=30%2F03%2F2026' },
    cataluna: { official:true, provisional:false, source:'DOGC · Orden EMT/52/2026, de 25 de marzo', sourceUrl:'https://treball.gencat.cat/ca/ambits/relacions_laborals/ci/calendari_laboral/calendari-festes-2027/' },
    extremadura: { official:true, provisional:false, source:'DOE · Decreto 119/2026, de 2 de junio', sourceUrl:'https://doe.juntaex.es/otrosFormatos/html.php?anio=2026&doe=1080o&xml=2026040142' },
    galicia: { official:true, provisional:false, source:'DOG · Decreto 68/2026, de 15 de junio', sourceUrl:'https://abertos.xunta.gal/es/catalogo/economia-empresa-emprego/-/dataset/0699/calendario-laboral-2027' },
    madrid: { official:false, provisional:true, source:'Referencia provisional no oficial · pendiente de publicación en el BOCM', sourceUrl:REFERENCIA_PROVISIONAL_2027 },
    murcia: { official:true, provisional:false, source:'CARM · Acuerdo del Consejo de Gobierno de 9 de abril de 2026', sourceUrl:'https://www.carm.es/web/pagina?IDCONTENIDO=124709&IDTIPO=10&RASTRO=c84%24s3%24m1775%2C2486' },
    navarra: { official:true, provisional:false, source:'BON · Resolución 232/2026, de 13 de mayo', sourceUrl:'https://bon.navarra.es/es/anuncio/-/texto/2026/103/23' },
    pais_vasco: { official:true, provisional:false, source:'BOPV · Decreto 90/2026, de 9 de junio', sourceUrl:'https://www.euskadi.eus/bopv2/datos/2026/07/2603215a.shtml' },
    rioja: { official:true, provisional:false, source:'BOR · Resolución 186/2026, de 30 de abril', sourceUrl:'https://web.larioja.org/bor-portada/boranuncio?n=anu-577043' },
    valenciana: { official:true, provisional:false, source:'DOGV · Decreto 42/2026, de 20 de marzo', sourceUrl:'https://dogv.gva.es/datos/2026/03/25/pdf/2026_8641_es.pdf' },
    ceuta: { official:false, provisional:true, source:'Referencia provisional no oficial · pendiente de publicación oficial de la Ciudad de Ceuta', sourceUrl:REFERENCIA_PROVISIONAL_2027 },
    melilla: { official:false, provisional:true, source:'Referencia provisional no oficial · pendiente de publicación en el BOME', sourceUrl:REFERENCIA_PROVISIONAL_2027 }
  };

  // Las filas con TODAS_REGIONES son el conjunto común que puede mostrarse para España.
  // El resto son fechas territoriales. Los calendarios finales se derivan de estas filas.
  const FILAS_CALENDARIO_2026 = [
    ['2026-01-01','Año Nuevo',TODAS_REGIONES], ['2026-01-06','Epifanía del Señor',TODAS_REGIONES],
    ['2026-02-28','Día de Andalucía',['andalucia']], ['2026-03-02','Día de las Illes Balears (traslado)',['baleares']],
    ['2026-03-19','San José',['galicia','murcia','navarra','pais_vasco','valenciana']], ['2026-03-20','Fiesta del Eid Fitr',['melilla']],
    ['2026-04-02','Jueves Santo',['andalucia','aragon','asturias','baleares','canarias','cantabria','castilla_mancha','castilla_leon','extremadura','galicia','madrid','murcia','navarra','pais_vasco','rioja','ceuta','melilla']],
    ['2026-04-03','Viernes Santo',TODAS_REGIONES], ['2026-04-06','Lunes de Pascua',['baleares','castilla_mancha','cataluna','navarra','pais_vasco','rioja','valenciana']],
    ['2026-04-23','San Jorge / Día de Aragón',['aragon']], ['2026-04-23','Fiesta de Castilla y León',['castilla_leon']],
    ['2026-05-01','Fiesta del Trabajo',TODAS_REGIONES], ['2026-05-02','Fiesta de la Comunidad de Madrid',['madrid']],
    ['2026-05-27','Fiesta del Sacrificio',['ceuta','melilla']], ['2026-05-30','Día de Canarias',['canarias']],
    ['2026-06-04','Corpus Christi',['castilla_mancha']], ['2026-06-09','Día de la Región de Murcia',['murcia']], ['2026-06-09','Día de La Rioja',['rioja']],
    ['2026-06-24','San Juan',['cataluna','galicia','valenciana']], ['2026-07-25','Santiago Apóstol / Día Nacional de Galicia',['galicia']],
    ['2026-07-25','Santiago Apóstol',['pais_vasco']], ['2026-07-28','Día de las Instituciones de Cantabria',['cantabria']],
    ['2026-08-05','Nuestra Señora de África',['ceuta']], ['2026-08-15','Asunción de la Virgen',TODAS_REGIONES],
    ['2026-09-02','Día de Ceuta',['ceuta']], ['2026-09-08','Día de Asturias',['asturias']], ['2026-09-08','Día de Extremadura',['extremadura']],
    ['2026-09-11','Fiesta Nacional de Cataluña',['cataluna']], ['2026-09-15','La Bien Aparecida',['cantabria']],
    ['2026-10-09','Día de la Comunitat Valenciana',['valenciana']], ['2026-10-12','Fiesta Nacional de España',TODAS_REGIONES],
    ['2026-11-02','Todos los Santos (traslado)',['andalucia','aragon','asturias','canarias','castilla_mancha','castilla_leon','extremadura','madrid','navarra']],
    ['2026-12-07','Día de la Constitución (traslado)',['andalucia','aragon','asturias','cantabria','castilla_leon','extremadura','madrid','murcia','rioja','melilla']],
    ['2026-12-08','Inmaculada Concepción',TODAS_REGIONES], ['2026-12-25','Natividad del Señor',TODAS_REGIONES],
    ['2026-12-26','San Esteban',['baleares','cataluna']]
  ];

  const FILAS_CALENDARIO_2027 = [
    ['2027-01-01','Año Nuevo',TODAS_REGIONES], ['2027-01-06','Epifanía del Señor',TODAS_REGIONES],
    ['2027-03-01','Día de Andalucía / Día de las Illes Balears (traslado)',['andalucia','baleares']],
    ['2027-03-19','San José',['galicia','melilla','murcia','navarra','valenciana']],
    ['2027-03-25','Jueves Santo',['andalucia','aragon','asturias','baleares','canarias','cantabria','castilla_mancha','castilla_leon','ceuta','extremadura','galicia','madrid','melilla','murcia','navarra','pais_vasco','rioja']],
    ['2027-03-26','Viernes Santo',TODAS_REGIONES],
    ['2027-03-29','Lunes de Pascua',['baleares','cataluna','navarra','pais_vasco','rioja','valenciana']],
    ['2027-04-23','San Jorge / Día de Aragón',['aragon']], ['2027-04-23','Fiesta de Castilla y León',['castilla_leon']],
    ['2027-05-01','Fiesta del Trabajo',TODAS_REGIONES], ['2027-05-03','Día de la Comunidad de Madrid (traslado provisional)',['madrid']],
    ['2027-05-17','Día de las Letras Gallegas',['galicia']], ['2027-05-27','Corpus Christi',['castilla_mancha']],
    ['2027-05-30','Día de Canarias',['canarias']], ['2027-05-31','Día de Castilla-La Mancha',['castilla_mancha']],
    ['2027-06-09','Día de la Región de Murcia',['murcia']], ['2027-06-09','Día de La Rioja',['rioja']],
    ['2027-06-24','San Juan',['cataluna']], ['2027-07-28','Día de las Instituciones de Cantabria',['cantabria']],
    ['2027-08-05','Nuestra Señora de África (previsión)',['ceuta']],
    ['2027-08-16','Asunción de la Virgen (descanso trasladado)',['andalucia','aragon','asturias','canarias','castilla_leon','ceuta','madrid']],
    ['2027-09-08','Día de Asturias',['asturias']], ['2027-09-08','Día de Extremadura',['extremadura']],
    ['2027-09-11','Fiesta Nacional de Cataluña',['cataluna']], ['2027-09-15','La Bien Aparecida',['cantabria']],
    ['2027-09-17','Día de Melilla (previsión)',['melilla']], ['2027-10-07','Aniversario del primer Gobierno de Euskadi',['pais_vasco']],
    ['2027-10-09','Día de la Comunitat Valenciana',['valenciana']], ['2027-10-11','Descanso por la Asunción de la Virgen',['extremadura']],
    ['2027-10-12','Fiesta Nacional de España',TODAS_REGIONES],
    ['2027-11-01','Todos los Santos',TODAS_REGIONES], ['2027-12-03','San Francisco Javier · Día de Navarra',['navarra']],
    ['2027-12-06','Día de la Constitución',TODAS_REGIONES], ['2027-12-08','Inmaculada Concepción',TODAS_REGIONES],
    ['2027-12-25','Natividad del Señor',TODAS_REGIONES]
  ];

  function normalizarFestivos(festivos) {
    const porFecha = new Map();
    festivos.forEach(festivo => {
      const anterior = porFecha.get(festivo.date);
      if (!anterior || festivo.type === 'national') porFecha.set(festivo.date, festivo);
    });
    return [...porFecha.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Festivos estatales que cada territorio puede mantener, sustituir o trasladar.
  // La clasificación es explícita: no se deduce por el número de territorios.
  const FESTIVOS_ESTATALES_NO_COMUNES = new Set([
    '2026-03-19|San José',
    '2026-04-02|Jueves Santo',
    '2026-07-25|Santiago Apóstol',
    '2026-07-25|Santiago Apóstol / Día Nacional de Galicia',
    '2026-11-02|Todos los Santos (traslado)',
    '2026-12-07|Día de la Constitución (traslado)',
    '2027-03-19|San José',
    '2027-03-25|Jueves Santo',
    '2027-08-16|Asunción de la Virgen (traslado)',
    '2027-10-11|Descanso por Asunción de la Virgen'
  ]);

  function construirAno(filas) {
    const regions = Object.fromEntries(TODAS_REGIONES.map(region => [region, []]));
    const common = [];
    filas.forEach(([date, name, destinations]) => {
      const isCommon = destinations === TODAS_REGIONES;
      const type = isCommon || FESTIVOS_ESTATALES_NO_COMUNES.has(`${date}|${name}`) ? 'national' : 'regional';
      const holiday = Object.freeze({ date, name, type });
      if (isCommon) common.push(holiday);
      destinations.forEach(region => regions[region].push(holiday));
    });
    Object.keys(regions).forEach(region => { regions[region] = normalizarFestivos(regions[region]); });
    return { common:normalizarFestivos(common), regions };
  }

  const DATOS_2026 = construirAno(FILAS_CALENDARIO_2026);
  const DATOS_2027 = construirAno(FILAS_CALENDARIO_2027);
  const DATOS_ANUALES = {
    2026: { ...DATOS_2026, metadata:METADATOS_CALENDARIO_2026 },
    2027: { ...DATOS_2027, metadata:METADATOS_CALENDARIO_2027 }
  };

  function obtenerFestivos(year, region = 'espana') {
    const datos = DATOS_ANUALES[Number(year)];
    if (!datos) return [];
    return region === 'espana' ? datos.common : (datos.regions[region] || []);
  }

  function metadatosCalendario(year, region = 'espana') {
    return DATOS_ANUALES[Number(year)]?.metadata?.[region] || null;
  }

  function regionesParaPlanificador(datos) {
    return Object.fromEntries(Object.entries(datos.regions).map(([region, festivos]) => [region, festivos.map(festivo => [festivo.date, festivo.name])]));
  }

  const CALENDARIOS_LABORALES = {
    2026: { official:true, provisional:false, source:FUENTE_CALENDARIO_2026, regions:regionesParaPlanificador(DATOS_2026) },
    2027: { source:FUENTE_CALENDARIO_2027, regionMetadata:METADATOS_CALENDARIO_2027, regions:regionesParaPlanificador(DATOS_2027) }
  };
  const FESTIVOS_COMUNES_2026 = DATOS_2026.common.map(festivo => [festivo.date, festivo.name]);
  const FESTIVOS_CCAA_2026 = CALENDARIOS_LABORALES[2026].regions;

  const NOTAS_TERRITORIALES = {
    canarias:'El festivo insular depende de la isla y no está incluido en este calendario.',
    cataluna:'Arán aplica una sustitución territorial propia; consulta su calendario oficial cuando corresponda.'
  };

  global.MetaphaiCalendarios = Object.freeze({
    VERSION,
    YEARS:Object.freeze([2026, 2027]),
    ANO_CALENDARIO,
    FUENTE_CALENDARIO_2026,
    FUENTE_CALENDARIO_2027,
    TODAS_REGIONES:Object.freeze([...TODAS_REGIONES]),
    NOMBRES_REGIONES:Object.freeze({ ...NOMBRES_REGIONES }),
    METADATOS_CALENDARIO_2027,
    CALENDARIOS_LABORALES,
    FESTIVOS_COMUNES_2026,
    FESTIVOS_CCAA_2026,
    NOTAS_TERRITORIALES:Object.freeze({ ...NOTAS_TERRITORIALES }),
    obtenerFestivos,
    metadatosCalendario
  });
})(window);

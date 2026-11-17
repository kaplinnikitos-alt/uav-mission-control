/* UAV Studio preferences: language, appearance, keyboard navigation. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const translations = {
    kk: {
      'Обзор миссии':'Миссия шолуы','Подготовка данных':'Деректерді дайындау','Генерация траектории':'Траекторияны құру',
      'Управление полётом':'Ұшуды басқару','Обнаружение объектов':'Нысандарды анықтау','Построение карты':'Картаны құру',
      'Преобразование координат':'Координаталарды түрлендіру','Принятие решений':'Шешім қабылдау','Результаты и ИИ':'Нәтижелер және ЖИ',
      'Проектирование':'Жобалау','интеллектуальных':'зияткерлік','систем управления':'басқару жүйелерін',
      'Единая цифровая среда для планирования миссии, управления полётом, компьютерного зрения, картирования и интеллектуального принятия решений.':'Миссияны жоспарлау, ұшуды басқару, компьютерлік көру, картографиялау және зияткерлік шешім қабылдауға арналған бірыңғай цифрлық орта.',
      'Семь этапов миссии':'Миссияның жеті кезеңі','Параметры сценария':'Сценарий параметрлері','Классы методов ИИ':'ЖИ әдістерінің кластары',
      'Запустить рабочий процесс':'Жұмыс процесін бастау','Полная демонстрация':'Толық демонстрация',
      'Подготовка данных и ПО':'Деректер мен БҚ дайындау','Сбор, проверка качества, фильтрация и нормализация входных потоков.':'Кіріс ағындарын жинау, сапасын тексеру, сүзу және қалыпқа келтіру.',
      'Уровень шума сенсоров':'Датчиктер шуының деңгейі','Алгоритм фильтрации':'Сүзу алгоритмі','Включить фильтрацию':'Сүзуді қосу',
      'Генерация траектории':'Траекторияны құру','Управление полётом':'Ұшуды басқару','Обнаружение объектов':'Нысандарды анықтау',
      'Построение карты':'Картаны құру','Преобразование координат':'Координаталарды түрлендіру','Принятие решений':'Шешім қабылдау',
      'Результаты и демонстрация ИИ':'Нәтижелер және ЖИ демонстрациясы','Сравнение алгоритмов искусственного интеллекта':'Жасанды интеллект алгоритмдерін салыстыру',
      'Выбрать класс метода':'Әдіс класын таңдау','Пересчитать модель':'Модельді қайта есептеу',
      'Сформировать сводный отчёт / Экспорт данных':'Жиынтық есеп / Деректерді экспорттау',
      'Сгенерировать новое поле':'Жаңа өрісті жасау','Начать картирование':'Картографиялауды бастау','Сбросить карту':'Картаны қалпына келтіру',
      'Сбросить камеру':'Камераны қалпына келтіру','ТЕМА':'ТҮРІ','МИССИЯ':'МИССИЯ',
      'Агромониторинг и фитостресс':'Агромониторинг және фитостресс','Поиск и спасение объектов':'Іздеу және құтқару',
      'Мониторинг ЛЭП и инфраструктуры':'Электр желілері мен инфрақұрылымды бақылау',
      'Потоки входных данных':'Кіріс деректер ағындары','Используемые датасеты':'Қолданылатын деректер жиынтығы',
      'Тепловая карта поля':'Егістіктің жылу картасы','Спектральная кривая':'Спектрлік қисық',
      'Порог фитостресса':'Фитостресс шегі','Ожидание сканирования':'Сканерлеуді күту',
      'Ожидание запуска алгоритма.':'Алгоритмнің іске қосылуын күту.'
    }
  };
  const original = new WeakMap();
  const safeGet = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  let language = 'ru';
  const replaceText = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue.trim()) return;
    if (!original.has(node)) original.set(node, node.nodeValue);
    const base = original.get(node);
    let value = base;
    if (language === 'kk') {
      Object.keys(translations.kk).sort((a,b)=>b.length-a.length).forEach(k => {
        value = value.split(k).join(translations.kk[k]);
      });
    }
    if (node.nodeValue !== value) node.nodeValue = value;
  };
  const translateTree = (root=document.body) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n=walker.nextNode())) replaceText(n);
  };
  const addPreferences = () => {
    const actions = document.querySelector('.top-actions');
    if (!actions || $('languageSelect')) return;
    const wrap = document.createElement('div');
    wrap.className = 'prefs-wrap';
    wrap.innerHTML = `
      <label class="prefs-label" for="languageSelect">LANG</label>
      <select id="languageSelect" class="prefs-select" aria-label="Interface language">
        <option value="ru">RU</option><option value="kk">ҚАЗ</option>
      </select>
      <label class="prefs-label" for="appearanceSelect">APPEARANCE</label>
      <select id="appearanceSelect" class="prefs-select" aria-label="Appearance">
        <option value="dark">Graphite</option><option value="light">Light</option>
        <option value="oled">OLED</option><option value="warm">Warm</option>
      </select>`;
    actions.appendChild(wrap);
    const savedLang = safeGet('uav-language', 'ru');
    const savedTheme = safeGet('uav-theme-pro', safeGet('uav-theme', 'dark'));
    $('languageSelect').value = savedLang;
    $('appearanceSelect').value = savedTheme;
    setLanguage(savedLang);
    setAppearance(savedTheme);
    $('languageSelect').addEventListener('change', e => {
      setLanguage(e.target.value); safeSet('uav-language', e.target.value);
    });
    $('appearanceSelect').addEventListener('change', e => {
      setAppearance(e.target.value); safeSet('uav-theme-pro', e.target.value);
    });
  };
  function setLanguage(lang) {
    language = lang === 'kk' ? 'kk' : 'ru';
    document.documentElement.lang = language;
    translateTree();
  }
  function setAppearance(theme) {
    const allowed = ['dark','light','oled','warm'];
    theme = allowed.includes(theme) ? theme : 'dark';
    document.body.dataset.theme = theme === 'light' ? 'light' : theme;
    safeSet('uav-theme', theme === 'light' ? 'light' : 'dark');
  }
  // Additional restrained palettes.
  const style = document.createElement('style');
  style.textContent = `
    body[data-theme="oled"]{--bg:#000;--bg2:#080909;--panel:#090b0b;--panel2:#101212;--line:#202424;--text:#ecefef;--muted:#7d8583;background:#000}
    body[data-theme="oled"] .topbar{background:rgba(0,0,0,.94)}
    body[data-theme="oled"] .sidebar{background:#030404}
    body[data-theme="warm"]{--bg:#171512;--bg2:#1d1a16;--panel:#211e19;--panel2:#28231d;--line:#39332a;--text:#eee8dc;--muted:#a69a86;--cyan:#d8cbb4;--green:#a9b49c;background:#171512}
    body[data-theme="warm"] .topbar{background:rgba(23,21,18,.94)}
    body[data-theme="warm"] .sidebar{background:#191713}
    body[data-theme="warm"] .btn.primary{background:#ded5c6;border-color:#ded5c6;color:#24211b}
    .toast-studio{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:99;background:#e4e8e5;color:#171a19;padding:10px 16px;border-radius:999px;font-size:12px;font-weight:650;box-shadow:0 8px 28px #0004;opacity:0;pointer-events:none;transition:.2s}
    .toast-studio.show{opacity:1}
    .prefs-wrap{padding-left:10px;border-left:1px solid var(--line)}
  `;
  document.head.appendChild(style);
  function toast(message) {
    let el=$('studioToast');
    if(!el){el=document.createElement('div');el.id='studioToast';el.className='toast-studio';document.body.appendChild(el);}
    el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2100);
  }
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') {
      e.preventDefault();
      const choices=[['Обзор миссии','home'],['Подготовка данных','s1'],['Генерация траектории','s2'],['Управление полётом','s3'],['Обнаружение объектов','s4'],['Построение карты','s5'],['Преобразование координат','s6'],['Принятие решений','s7'],['Результаты и ИИ','res']];
      const current=location.hash.slice(1);
      const next=choices[(choices.findIndex(x=>x[1]===current)+1)%choices.length];
      location.hash='#'+next[1];toast('Открыт раздел: '+next[0]);
    }
    if(e.key==='?' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) toast('Ctrl / ⌘ + K — следующий раздел');
  });
  addPreferences();
  const observer = new MutationObserver(records => {
    for(const r of records) {
      if(r.type==='characterData') replaceText(r.target);
      r.addedNodes && r.addedNodes.forEach(node => {
        if(node.nodeType===Node.TEXT_NODE) replaceText(node);
        else if(node.nodeType===Node.ELEMENT_NODE) translateTree(node);
      });
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();

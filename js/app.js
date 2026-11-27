// ============================================================
// ИНТЕРАКТИВНАЯ ЛОГИКА САЙТА "ДОМАШНІЙ МАЙСТЕР ХЕРСОН"
// Язык, фильтрация прайса, живой калькулятор, отправка заявок
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Конфигурация сайта (защита от разных окружений браузера)
  const siteConfig = window.SITE_CONFIG || (typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG : null);
  if (!siteConfig) {
    console.error('SITE_CONFIG не знайдено! Перевірте підключення data/site-config.js');
  }

  // Текущий язык: по умолчанию 'ua' (или из localStorage)
  let currentLang = localStorage.getItem('site_lang') || 'ua';
  let activeCategory = 'all';
  let searchQuery = '';

  // Элементы DOM
  const langButtons = document.querySelectorAll('.lang-btn');
  const priceTableBody = document.getElementById('price-table-body');
  const categoryTabsContainer = document.getElementById('category-tabs');
  const searchInput = document.getElementById('price-search-input');
  const calcItemsContainer = document.getElementById('calc-items-container');
  const calcTotalElement = document.getElementById('calc-total-amount');
  const calcSendTgBtn = document.getElementById('calc-send-tg');
  const calcSendVbBtn = document.getElementById('calc-send-vb');
  const districtsContainer = document.getElementById('districts-container');
  const packagesContainer = document.getElementById('packages-container');
  const calcAddonsContainer = document.getElementById('calc-addons-container');
  const reviewsContainer = document.getElementById('reviews-container');
  const faqContainer = document.getElementById('faq-container');

  // Модальное окно
  const modal = document.getElementById('call-modal');
  const modalCloseBtn = document.getElementById('modal-close');
  const openModalBtns = document.querySelectorAll('[data-open-modal]');
  const modalForm = document.getElementById('modal-callback-form');

  // Мобильное меню
  const mobileToggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  // Калькулятор: текущие количества
  const calcState = {};
  if (siteConfig && siteConfig.calculatorItems) {
    siteConfig.calculatorItems.forEach(item => {
      calcState[item.id] = item.defaultQty || 0;
    });
  }

  // Дополнительные платные опции (Add-ons)
  const calcAddonsState = {};
  if (siteConfig && siteConfig.calculatorAddons) {
    siteConfig.calculatorAddons.forEach(a => {
      calcAddonsState[a.id] = false;
    });
  }

  // 1. Инициализация ссылок и контактов из конфига
  function initContacts() {
    if (!siteConfig) return;
    const { contacts } = siteConfig;

    // Телефоны
    document.querySelectorAll('[data-contact="phone-primary-text"]').forEach(el => {
      el.textContent = contacts.phonePrimary;
    });
    document.querySelectorAll('[data-contact="phone-primary-link"]').forEach(el => {
      el.href = `tel:${contacts.phonePrimaryRaw}`;
    });
    if (contacts.phoneSecondary) {
      document.querySelectorAll('[data-contact="phone-secondary-text"]').forEach(el => {
        el.textContent = contacts.phoneSecondary;
      });
      document.querySelectorAll('[data-contact="phone-secondary-link"]').forEach(el => {
        el.href = `tel:${contacts.phoneSecondaryRaw}`;
      });
    } else {
      document.querySelectorAll('[data-contact="phone-secondary-link"]').forEach(el => {
        const li = el.closest('li');
        if (li) li.remove();
        else el.style.display = 'none';
      });
    }

    // Telegram
    document.querySelectorAll('[data-contact="telegram-link"]').forEach(el => {
      el.href = contacts.telegramLink;
    });

    // Viber
    document.querySelectorAll('[data-contact="viber-link"]').forEach(el => {
      el.href = contacts.viberLink;
    });

    // WhatsApp
    document.querySelectorAll('[data-contact="whatsapp-link"]').forEach(el => {
      el.href = contacts.whatsappLink;
    });

    // Email
    document.querySelectorAll('[data-contact="email-text"]').forEach(el => {
      el.textContent = contacts.email;
    });
    document.querySelectorAll('[data-contact="email-link"]').forEach(el => {
      el.href = `mailto:${contacts.email}`;
    });
  }

  // 2. Переключение языков
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('site_lang', lang);

    // Подсветка кнопок языка
    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Перевод статических элементов с атрибутами data-ua / data-ru
    document.querySelectorAll('[data-ua][data-ru]').forEach(el => {
      const text = el.getAttribute(`data-${lang}`);
      if (text) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else {
          el.innerHTML = text;
        }
      }
    });

    // Перерисовка динамических блоков
    renderDistricts();
    renderPackages();
    renderCategoryTabs();
    renderPriceTable();
    renderCalculator();
    renderCalculatorAddons();
    renderReviews();
    renderFAQ();
    updateCalcTotal();
  }

  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
    });
  });

  // 3. Отрисовка районов Херсона
  function renderDistricts() {
    if (!districtsContainer || !siteConfig) return;
    const { districts } = siteConfig;

    districtsContainer.innerHTML = districts.map(d => `
      <div class="district-tag">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>${d[currentLang]}</span>
      </div>
    `).join('');
  }

  // 3b. Отрисовка комплексных пакетов (Upsell)
  function renderPackages() {
    if (!packagesContainer || !siteConfig || !siteConfig.packages) return;
    const { packages } = siteConfig;

    packagesContainer.innerHTML = packages.map(pkg => {
      const btnText = currentLang === 'ua' ? 'Замовити цей пакет' : 'Заказать этот пакет';
      const featuresHtml = pkg.features[currentLang].map(f => `
        <li>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${f}</span>
        </li>
      `).join('');

      return `
        <div class="package-card ${pkg.popular ? 'popular' : ''}">
          ${pkg.badge ? `<div class="package-badge">${pkg.badge[currentLang]}</div>` : ''}
          <div class="package-header">
            <h3 class="package-title">${pkg.title[currentLang]}</h3>
            <p class="package-subtitle">${pkg.subtitle[currentLang]}</p>
          </div>

          <div class="package-price-box">
            <div class="package-old-price">${pkg.oldPrice} грн</div>
            <div class="package-price">${pkg.price} <span class="package-currency">грн</span></div>
            <div class="package-savings">${pkg.savings[currentLang]}</div>
          </div>

          <ul class="package-features">
            ${featuresHtml}
          </ul>

          <button type="button" class="btn btn-primary package-order-btn" onclick="openOrderModalWithService('${encodeURIComponent(pkg.title[currentLang] + ' (' + pkg.price + ' грн)')}')">
            ${btnText}
          </button>
        </div>
      `;
    }).join('');
  }

  // 4. Отрисовка вкладок категорий прайса
  function renderCategoryTabs() {
    if (!categoryTabsContainer || !siteConfig) return;
    const { categories } = siteConfig;

    const allLabel = currentLang === 'ua' ? 'Всі послуги' : 'Все услуги';
    let html = `
      <button class="category-tab-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        ${allLabel}
      </button>
    `;

    categories.forEach(cat => {
      html += `
        <button class="category-tab-btn ${activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
          ${cat.name[currentLang]}
        </button>
      `;
    });

    categoryTabsContainer.innerHTML = html;

    categoryTabsContainer.querySelectorAll('.category-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        categoryTabsContainer.querySelectorAll('.category-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPriceTable();
      });
    });
  }

  // 5. Отрисовка таблицы прайса с фильтрацией и поиском
  function renderPriceTable() {
    if (!priceTableBody || !siteConfig) return;
    const { categories } = siteConfig;

    let allItems = [];
    categories.forEach(cat => {
      if (activeCategory === 'all' || activeCategory === cat.id) {
        cat.items.forEach(item => {
          allItems.push({
            ...item,
            categoryName: cat.name[currentLang]
          });
        });
      }
    });

    // Фильтрация по поисковому запросу
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      allItems = allItems.filter(item => {
        const name = (item.name[currentLang] || '').toLowerCase();
        const cat = (item.categoryName || '').toLowerCase();
        return name.includes(q) || cat.includes(q);
      });
    }

    if (allItems.length === 0) {
      const noResults = currentLang === 'ua'
        ? 'Послуг не знайдено за вашим запитом. Зателефонуйте майстру для уточнення ціни!'
        : 'Услуг не найдено по вашему запросу. Позвоните мастеру для уточнения цены!';
      priceTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
            ${noResults}
          </td>
        </tr>
      `;
      return;
    }

    const orderBtnText = currentLang === 'ua' ? 'Замовити' : 'Заказать';
    const popularText = currentLang === 'ua' ? 'Популярне' : 'Популярно';

    priceTableBody.innerHTML = allItems.map(item => `
      <tr>
        <td class="price-name-cell">
          ${item.name[currentLang]}
          ${item.popular ? `<span class="price-tag-popular">${popularText}</span>` : ''}
        </td>
        <td class="price-value-cell">${item.priceText[currentLang]}</td>
        <td class="price-unit-cell">${item.unit[currentLang]}</td>
        <td class="price-action-cell">
          <button class="price-quick-btn" onclick="openOrderModalWithService('${encodeURIComponent(item.name[currentLang])}')">
            ${orderBtnText}
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Живой поиск
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderPriceTable();
    });
  }

  // 6. Отрисовка калькулятора
  function renderCalculator() {
    if (!calcItemsContainer || !siteConfig) return;
    const { calculatorItems } = siteConfig;

    calcItemsContainer.innerHTML = calculatorItems.map(item => {
      const qty = calcState[item.id] || 0;
      const unitLabel = currentLang === 'ua' ? 'грн/од' : 'грн/ед';

      return `
        <div class="calc-row ${qty > 0 ? 'has-qty' : ''}" id="calc-row-${item.id}">
          <div class="calc-item-info">
            <div class="calc-item-title">${item.name[currentLang]}</div>
            <div class="calc-item-price-unit">${item.price} ${unitLabel}</div>
          </div>
          <div class="calc-stepper">
            <button type="button" class="calc-step-btn" data-action="dec" data-id="${item.id}">−</button>
            <input type="text" readonly class="calc-qty-input" id="qty-${item.id}" value="${qty}">
            <button type="button" class="calc-step-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>
      `;
    }).join('');

    // Привязка кнопок инкремента/декремента
    calcItemsContainer.querySelectorAll('.calc-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const itemConfig = siteConfig.calculatorItems.find(i => i.id === id);
        if (!itemConfig) return;

        let currentVal = calcState[id] || 0;
        if (action === 'inc' && currentVal < (itemConfig.max || 99)) {
          currentVal += 1;
        } else if (action === 'dec' && currentVal > (itemConfig.min || 0)) {
          currentVal -= 1;
        }

        calcState[id] = currentVal;
        const input = document.getElementById(`qty-${id}`);
        if (input) input.value = currentVal;

        const row = document.getElementById(`calc-row-${id}`);
        if (row) row.classList.toggle('has-qty', currentVal > 0);

        updateCalcTotal();
      });
    });
  }

  // 6b. Отрисовка полезных платных допродаж (Add-ons)
  function renderCalculatorAddons() {
    if (!calcAddonsContainer || !siteConfig || !siteConfig.calculatorAddons) return;
    const { calculatorAddons } = siteConfig;

    calcAddonsContainer.innerHTML = calculatorAddons.map(addon => {
      const isChecked = !!calcAddonsState[addon.id];
      return `
        <label class="calc-addon-item ${isChecked ? 'active' : ''}">
          <input type="checkbox" class="calc-addon-checkbox" data-id="${addon.id}" ${isChecked ? 'checked' : ''}>
          <div class="calc-addon-content">
            <span class="calc-addon-name">${addon.name[currentLang]}</span>
            <span class="calc-addon-price">+${addon.price} грн</span>
          </div>
        </label>
      `;
    }).join('');

    calcAddonsContainer.querySelectorAll('.calc-addon-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        calcAddonsState[id] = cb.checked;
        const item = cb.closest('.calc-addon-item');
        if (item) item.classList.toggle('active', cb.checked);
        updateCalcTotal();
      });
    });
  }

  // Подсчет общей суммы калькулятора и генерация ссылок в мессенджеры
  function updateCalcTotal() {
    if (!calcTotalElement || !siteConfig) return;
    const { calculatorItems, calculatorAddons, contacts } = siteConfig;

    let total = 0;
    const selectedList = [];

    calculatorItems.forEach(item => {
      const qty = calcState[item.id] || 0;
      if (qty > 0) {
        const itemSum = qty * item.price;
        total += itemSum;
        selectedList.push({
          name: item.name[currentLang],
          qty: qty,
          sum: itemSum
        });
      }
    });

    if (calculatorAddons) {
      calculatorAddons.forEach(addon => {
        if (calcAddonsState[addon.id]) {
          total += addon.price;
          selectedList.push({
            name: `${addon.name[currentLang]}`,
            qty: 1,
            sum: addon.price
          });
        }
      });
    }

    calcTotalElement.textContent = `${total.toLocaleString()} грн`;

    // Формирование сообщения для Telegram / Viber
    const greeting = currentLang === 'ua'
      ? 'Доброго дня! Заявка на виклик майстра (Херсон: Кольцова / Таврійський / Північний):\n'
      : 'Здравствуйте! Заявка на вызов мастера (Херсон: Кольцова / Таврический / Северный):\n';

    let messageText = greeting;
    selectedList.forEach(item => {
      messageText += `• ${item.name}: ${item.qty} шт (~${item.sum} грн)\n`;
    });

    const totalLabel = currentLang === 'ua' ? 'Орієнтовна сума (з викликом):' : 'Ориентировочная сумма (с вызовом):';
    messageText += `\n${totalLabel} ${total} грн.`;

    // Ссылка на Telegram
    if (calcSendTgBtn) {
      calcSendTgBtn.href = `https://t.me/${contacts.telegramUsername}?text=${encodeURIComponent(messageText)}`;
    }

    // Ссылка на Viber
    if (calcSendVbBtn) {
      calcSendVbBtn.href = `viber://chat?number=%2B${contacts.viberNumber.replace(/\D/g, '')}&text=${encodeURIComponent(messageText)}`;
    }
  }

  // 7. Отрисовка отзывов
  function renderReviews() {
    if (!reviewsContainer || !siteConfig) return;
    const { reviews } = siteConfig;

    reviewsContainer.innerHTML = reviews.map(r => {
      const initial = (r.name || 'К').charAt(0);
      return `
        <div class="review-card">
          <div>
            <div class="review-header">
              <div class="review-author-box">
                <div class="review-avatar">${initial}</div>
                <div>
                  <div class="review-author">${r.name}</div>
                  <div class="review-district">${r.district[currentLang]}</div>
                </div>
              </div>
              <div class="review-stars">★★★★★</div>
            </div>
            ${r.tag ? `<div class="review-service-tag">✓ ${r.tag[currentLang]}</div>` : ''}
            <p class="review-text">${r.text[currentLang]}</p>
          </div>
          <div class="review-date">${r.date}</div>
        </div>
      `;
    }).join('');
  }

  // 8. Отрисовка FAQ
  function renderFAQ() {
    if (!faqContainer || !siteConfig) return;
    const { faq } = siteConfig;

    faqContainer.innerHTML = faq.map((item, idx) => `
      <div class="faq-item" id="faq-item-${idx}">
        <div class="faq-question" data-idx="${idx}">
          <span>${item.q[currentLang]}</span>
          <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="faq-answer">
          <p>${item.a[currentLang]}</p>
        </div>
      </div>
    `).join('');

    faqContainer.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.closest('.faq-item');
        const isActive = item.classList.contains('active');
        faqContainer.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    });
  }

  // 9. Модальное окно
  window.openOrderModalWithService = function(serviceName) {
    if (!modal) return;
    const decodedName = decodeURIComponent(serviceName || '');
    const serviceInput = document.getElementById('modal-service-name');
    if (serviceInput && decodedName) {
      serviceInput.value = decodedName;
    }
    modal.classList.add('active');
  };

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Отправка формы обратного звонка (Модальное окно)
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-user-name').value;
      const phone = document.getElementById('modal-user-phone').value;
      const district = document.getElementById('modal-user-district').value;
      const service = document.getElementById('modal-service-name').value || (currentLang === 'ua' ? 'Виклик майстра' : 'Вызов мастера');

      const tgText = currentLang === 'ua'
        ? `Доброго дня! Заявка на виклик майстра з сайту:\n👤 Ім'я: ${name}\n📞 Телефон: ${phone}\n📍 Район: ${district}\n🛠 Що зробити: ${service}`
        : `Здравствуйте! Заявка на вызов мастера с сайта:\n👤 Имя: ${name}\n📞 Телефон: ${phone}\n📍 Район: ${district}\n🛠 Что сделать: ${service}`;

      // Перенаправляем прямо в Telegram-бот
      const botUrl = `https://t.me/${(siteConfig && siteConfig.contacts ? siteConfig.contacts.telegramUsername : 'masterdomaks_bot')}?text=${encodeURIComponent(tgText)}`;
      window.open(botUrl, '_blank');

      const successMsg = currentLang === 'ua'
        ? `Дякуємо, ${name}! Заявку сформовано. Зараз відкриється діалог з ботом @masterdomaks_bot, або я передзвоню вам на номер ${phone}.`
        : `Спасибо, ${name}! Заявка сформирована. Сейчас откроется диалог с ботом @masterdomaks_bot, или я перезвоню вам на номер ${phone}.`;

      alert(successMsg);
      modalForm.reset();
      modal.classList.remove('active');
    });
  }

  // Обработка формы на первом экране (Hero)
  const heroForm = document.getElementById('hero-quick-form');
  if (heroForm) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = document.getElementById('hero-phone').value;
      const service = document.getElementById('hero-service').value || (currentLang === 'ua' ? 'Виклик майстра' : 'Вызов мастера');

      const tgText = currentLang === 'ua'
        ? `Доброго дня! Заявка на виклик майстра з сайту:\n📞 Телефон: ${phone}\n🛠 Що зробити: ${service}`
        : `Здравствуйте! Заявка на вызов мастера с сайта:\n📞 Телефон: ${phone}\n🛠 Что сделать: ${service}`;

      // Перенаправляем прямо в Telegram-бот
      const botUrl = `https://t.me/${(siteConfig && siteConfig.contacts ? siteConfig.contacts.telegramUsername : 'masterdomaks_bot')}?text=${encodeURIComponent(tgText)}`;
      window.open(botUrl, '_blank');

      const successMsg = currentLang === 'ua'
        ? `Дякуємо! Заявку сформовано. Зараз відкриється діалог з ботом @masterdomaks_bot, або я зв'яжуся з вами за номером ${phone}.`
        : `Спасибо! Заявка сформирована. Сейчас откроется диалог с ботом @masterdomaks_bot, или я свяжусь с вами по номеру ${phone}.`;

      alert(successMsg);
      heroForm.reset();
    });
  }

  // Мобильное меню toggle
  if (mobileToggleBtn && navMenu) {
    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('open');
    });

    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });
  }

  // Быстрый выбор частых проблем (Quick Issue Chips)
  function initIssueChips() {
    document.querySelectorAll('.issue-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const container = chip.closest('.form-group');
        if (!container) return;
        const input = container.querySelector('input[type="text"]');
        if (!input) return;

        const val = chip.getAttribute(`data-issue-${currentLang}`) || chip.getAttribute('data-issue') || chip.textContent.trim();
        input.value = val;
        input.focus();

        container.querySelectorAll('.issue-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  }

  // Переключение крупного шрифта для людей старшего возраста
  const fontSizeToggleBtn = document.getElementById('font-size-toggle');
  function initFontSizeToggle() {
    const savedFontSize = localStorage.getItem('site_font_size');
    if (savedFontSize === 'large') {
      document.body.classList.add('font-large');
      if (fontSizeToggleBtn) fontSizeToggleBtn.classList.add('active');
    }

    if (fontSizeToggleBtn) {
      fontSizeToggleBtn.addEventListener('click', () => {
        const isLarge = document.body.classList.toggle('font-large');
        fontSizeToggleBtn.classList.toggle('active', isLarge);
        localStorage.setItem('site_font_size', isLarge ? 'large' : 'normal');
      });
    }
  }

  // Запуск первичной инициализации
  initContacts();
  initIssueChips();
  initFontSizeToggle();
  setLanguage(currentLang);
});

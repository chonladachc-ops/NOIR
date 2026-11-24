/* ==========================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   ตรวจจาก id ของ element ในหน้านั้นๆ แล้วเริ่มทำงานเฉพาะส่วนที่เกี่ยวข้อง
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const PRODUCTS_URL = 'products.json';

const ORDER_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbyb7PXDJsqz3aYP-xFA7TCswyHr3twOmpaMvHuZTsyZw-HVP6KaQZmLOy-7Sx6X6kwQnQ/exec';

const ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlL5Tvhx_8aUaMjnChDxY_wvqJB6tv-Qsm_X_9u_i5gp2yeWpM7pqBkwOfZqFwXLp9O9ufjpU6aabh/pub?gid=0&single=true&output=csv';

const MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

/* ---------- Helpers ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatNumber(value) {
  return Number(value).toLocaleString('th-TH');
}

function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

/* ==========================================================
   1) product.html — แสดงการ์ดสินค้า + กรองตาม mood
   ========================================================== */
function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const list = document.getElementById('product-list');
  if (!filterBar || !list) return;

  let products = [];

  const params = new URLSearchParams(window.location.search);
  const requested = (params.get('mood') || '').toLowerCase();
  let activeMood = MOODS.some(m => m.key === requested) ? requested : 'all';

  function buildFilterBar() {
    filterBar.textContent = '';
    MOODS.forEach(mood => {
      const btn = el('button', 'filter-btn');
      btn.type = 'button';
      btn.dataset.filter = mood.key;
      if (mood.key !== 'all') {
        btn.dataset.mood = mood.key; // ให้จุดสี mood ทำงานตาม CSS
        btn.appendChild(el('span', 'dot'));
      }
      btn.appendChild(document.createTextNode(mood.label));
      btn.addEventListener('click', () => {
        activeMood = mood.key;
        updateFilterState();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
    updateFilterState();
  }

  function updateFilterState() {
    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      const isActive = btn.dataset.filter === activeMood;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function orderUrl(product) {
    const itemName = [product.name, product.size].filter(Boolean).join(' ');
    const query = new URLSearchParams({ item: itemName, price: product.price });
    return 'order.html?' + query.toString();
  }

  function buildCard(product) {
    const card = el('article', 'card');
    card.dataset.mood = product.mood;

    const media = el('div', 'card-media');
    const img = el('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    media.appendChild(img);

    const body = el('div', 'card-body');

    const moodLine = el('div', 'card-mood');
    moodLine.appendChild(el('span', 'dot'));
    const moodInfo = MOODS.find(m => m.key === product.mood);
    moodLine.appendChild(el('span', '', moodInfo ? moodInfo.label : product.mood));

    const title = el('h3', 'card-title', product.name);

    const foot = el('div', 'card-foot');
    foot.appendChild(el('span', 'card-size', product.size || ''));
    const price = el('span', 'price', formatNumber(product.price));
    price.appendChild(el('small', '', 'บาท'));
    foot.appendChild(price);

    const buy = el('a', 'btn btn--block', 'สั่งซื้อ');
    buy.href = orderUrl(product);
    buy.style.marginTop = 'var(--space-2)';

    body.append(moodLine, title, foot, buy);
    card.append(media, body);
    return card;
  }

  function renderProducts() {
    list.textContent = '';
    const shown =
      activeMood === 'all' ? products : products.filter(p => p.mood === activeMood);

    if (shown.length === 0) {
      list.appendChild(el('p', 'muted', 'ยังไม่มีสินค้าในหมวดนี้'));
      return;
    }
    shown.forEach(p => list.appendChild(buildCard(p)));
  }

  buildFilterBar();
  list.appendChild(el('p', 'muted', 'กำลังโหลดสินค้า...'));

  fetch(PRODUCTS_URL)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      products = data;
      renderProducts();
    })
    .catch(error => {
      console.error(error);
      list.textContent = '';
      list.appendChild(el('p', 'muted', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
    });
}

/* ==========================================================
   2) order.html — เติมชื่อสินค้า/ราคาจาก URL + ส่งฟอร์ม
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  if (!form) return;

  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // เติมทั้งช่อง items และ total ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');
  if (item !== null && itemsInput) itemsInput.value = item;
  if (price !== null && totalInput) totalInput.value = price;

  form.addEventListener('submit', event => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const value = id => {
      const input = document.getElementById(id);
      return input ? input.value.trim() : '';
    };

    const payload = {
      customerName: value('customerName'),
      contact: value('contact'),
      items: value('items'),
      total: value('total'),
      note: value('note')
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================
   3) admin.html — ดึง CSV จาก Google Sheet แสดงเป็นตาราง
   ========================================================== */

// parse CSV เอง: รองรับ "..." ครอบข้อความ, "" แทนเครื่องหมายคำพูด,
// เครื่องหมายจุลภาคและขึ้นบรรทัดใหม่ภายในช่อง, และ \r\n
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  const COLUMNS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

  function showMessage(message) {
    tbody.textContent = '';
    const tr = el('tr');
    const td = el('td', 'muted', message);
    td.colSpan = COLUMNS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function formatTotal(raw) {
    const num = Number(String(raw).replace(/,/g, ''));
    return raw !== '' && !Number.isNaN(num) ? formatNumber(num) + ' บาท' : raw;
  }

  function renderRows(rows) {
    tbody.textContent = '';
    rows.forEach(cells => {
      const tr = el('tr');
      for (let i = 0; i < COLUMNS; i++) {
        const raw = (cells[i] || '').trim();
        tr.appendChild(el('td', '', i === 4 ? formatTotal(raw) : raw));
      }
      tbody.appendChild(tr);
    });
  }

  showMessage('กำลังโหลดข้อมูล...');

  // เติมพารามิเตอร์ท้าย URL กัน cache ของเบราว์เซอร์
  fetch(ORDERS_CSV_URL + '&_=' + Date.now(), { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(text => {
      const all = parseCSV(text);
      // ตัดแถวหัวตารางแถวแรก และแถวว่าง
      const data = all
        .slice(1)
        .filter(cells => cells.some(c => c.trim() !== ''));

      if (data.length === 0) {
        showMessage('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      // Sheet เพิ่มแถวใหม่ต่อท้ายเสมอ จึงกลับลำดับให้ล่าสุดขึ้นก่อน
      renderRows(data.reverse());
    })
    .catch(error => {
      console.error(error);
      showMessage('โหลดข้อมูลไม่สำเร็จ กรุณาลองรีเฟรชหน้านี้อีกครั้ง');
    });
}

/* ---------- Start ---------- */
onReady(() => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});

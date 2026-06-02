const STORAGE_KEY = "poor-diary-transactions-v1";
const API_KEY_STORAGE = "poor-diary-openai-key";
const MODEL_STORAGE = "poor-diary-openai-model";
const LEGACY_KEYS = ["nyc-pocket-ledger-v2", "budget_app_entries_v1", "budget-flow-transactions-v1"];

const CATEGORIES = {
  expense: [
    "HOA",
    "房屋贷款",
    "水电网气",
    "地铁公交",
    "买菜超市",
    "外食",
    "手机账单",
    "车险",
    "油费",
    "Toll Fee",
    "停车费",
    "车辆保养",
    "医疗",
    "购物",
    "订阅服务",
    "投资理财",
    "家庭日用",
    "其他",
  ],
  income: ["工资", "奖金", "报销/退款", "现金收入", "投资收益", "二手转卖", "礼金", "其他"],
};

const PAYMENTS = [
  "Credit Card",
  "Debit Card",
  "Apple Pay",
  "Cash",
  "Zelle",
  "ACH / Bank Transfer",
  "Check",
  "EBT / SNAP",
  "Other",
];

const CHART_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be123c",
  "#65a30d",
  "#9333ea",
  "#0f766e",
];

const CATEGORY_MIGRATION = {
  房租水电: "房屋贷款",
  房租: "房屋贷款",
  "Rent & Utilities": "房屋贷款",
  水电网: "水电网气",
  地铁通勤: "地铁公交",
  交通: "地铁公交",
  Transit: "地铁公交",
  外卖堂食: "外食",
  餐饮: "外食",
  Dining: "外食",
  买菜华超: "买菜超市",
  超市: "买菜超市",
  Groceries: "买菜超市",
  咖啡奶茶: "外食",
  手机网费: "手机账单",
  购物美妆: "购物",
  Shopping: "购物",
  医疗保险: "医疗",
  Healthcare: "医疗",
  娱乐: "订阅服务",
  订阅软件: "订阅服务",
  订阅: "订阅服务",
  燃油: "油费",
  汽车保险保养: "车险",
  Paycheck: "工资",
  主业收入: "工资",
  副业收入: "工资",
  Freelance: "工资",
  Bonus: "奖金",
  Investment: "投资收益",
  投资利息: "投资收益",
  理财: "投资收益",
  Refund: "报销/退款",
  退税: "报销/退款",
  "退税/报销": "报销/退款",
  转账收入: "现金收入",
};

const state = {
  transactions: [],
  selectedMonth: currentMonth(),
  selectedDay: today(),
};

const el = {
  form: document.querySelector("#transactionForm"),
  category: document.querySelector("#categoryField"),
  payment: document.querySelector("#paymentField"),
  datetime: document.querySelector("#datetimeField"),
  month: document.querySelector("#monthSelector"),
  latestList: document.querySelector("#latestList"),
  dayList: document.querySelector("#dayList"),
  template: document.querySelector("#transactionItemTemplate"),
  periodLabel: document.querySelector("#periodLabel"),
  balanceAmount: document.querySelector("#balanceAmount"),
  balanceHint: document.querySelector("#balanceHint"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  calendar: document.querySelector("#calendarGrid"),
  incomeMetric: document.querySelector("#incomeMetric"),
  expenseMetric: document.querySelector("#expenseMetric"),
  dailyMetric: document.querySelector("#dailyMetric"),
  topMetric: document.querySelector("#topMetric"),
  barChart: document.querySelector("#barChart"),
  pieChart: document.querySelector("#pieChart"),
  trendChart: document.querySelector("#trendChart"),
  apiKey: document.querySelector("#apiKeyField"),
  model: document.querySelector("#modelField"),
  aiResult: document.querySelector("#aiResult"),
};

boot();

function boot() {
  hydrate();
  fillNow();
  populateCategories("expense");
  populatePayments();
  bindEvents();
  renderAll();
  registerServiceWorker();
}

function hydrate() {
  const saved = readStorage(STORAGE_KEY);
  const legacy = LEGACY_KEYS.flatMap(readStorage);
  state.transactions = saved.length ? saved.map(migrate) : legacy.map(migrate);

  if (!state.transactions.length) {
    state.transactions = seedTransactions();
  }

  state.transactions.sort((a, b) => b.datetime.localeCompare(a.datetime));
  el.month.value = state.selectedMonth;
  el.apiKey.value = localStorage.getItem(API_KEY_STORAGE) || "";
  el.model.value = localStorage.getItem(MODEL_STORAGE) || "gpt-5";
  persist();
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  el.form.addEventListener("submit", saveTransaction);
  el.form.querySelectorAll('input[name="type"]').forEach((input) => {
    input.addEventListener("change", (event) => populateCategories(event.target.value));
  });

  el.month.addEventListener("change", (event) => {
    state.selectedMonth = event.target.value;
    state.selectedDay = `${state.selectedMonth}-01`;
    renderAll();
  });

  document.querySelector("#useNowButton").addEventListener("click", fillNow);
  document.querySelector("#exportButton").addEventListener("click", exportExcel);
  document.querySelector("#csvButton").addEventListener("click", exportCsv);
  document.querySelector("#jsonButton").addEventListener("click", exportJson);
  document.querySelector("#restoreInput").addEventListener("change", restoreJson);
  document.querySelector("#copyPromptButton").addEventListener("click", copyAiPrompt);
  document.querySelector("#aiButton").addEventListener("click", runAiAnalysis);
  el.apiKey.addEventListener("change", () => localStorage.setItem(API_KEY_STORAGE, el.apiKey.value.trim()));
  el.model.addEventListener("change", () => localStorage.setItem(MODEL_STORAGE, el.model.value.trim() || "gpt-5"));
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function populateCategories(type) {
  el.category.innerHTML = CATEGORIES[type].map((item) => `<option>${escapeHtml(item)}</option>`).join("");
}

function populatePayments() {
  el.payment.innerHTML = PAYMENTS.map((item) => `<option>${escapeHtml(item)}</option>`).join("");
}

function saveTransaction(event) {
  event.preventDefault();
  const data = new FormData(el.form);
  const datetime = data.get("datetime");
  const transaction = {
    id: crypto.randomUUID(),
    type: data.get("type"),
    amount: Number(data.get("amount")),
    datetime,
    date: datetime.slice(0, 10),
    category: data.get("category"),
    payment: data.get("payment"),
    merchant: data.get("merchant").trim(),
    tag: data.get("tag"),
    note: data.get("note").trim(),
    createdAt: new Date().toISOString(),
  };

  state.transactions.unshift(transaction);
  state.selectedMonth = transaction.datetime.slice(0, 7);
  state.selectedDay = transaction.date;
  el.month.value = state.selectedMonth;
  persist();
  el.form.reset();
  el.form.querySelector('input[name="type"][value="expense"]').checked = true;
  populateCategories("expense");
  populatePayments();
  fillNow();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderTransactions();
  renderCalendar();
  renderStats();
  renderAiLocalAdvice();
}

function renderSummary() {
  const monthItems = monthTransactions();
  const income = sum(monthItems, "income");
  const expense = sum(monthItems, "expense");
  const balance = income - expense;
  const top = topCategory(monthItems);

  el.periodLabel.textContent = `${state.selectedMonth} 结余`;
  el.balanceAmount.textContent = money(balance);
  el.balanceHint.textContent = monthItems.length
    ? `本月最大支出是 ${top?.category || "暂无"}。`
    : "还没有记录。穷，也要穷得明白。";
}

function renderTransactions() {
  renderList(el.latestList, monthTransactions().slice(0, 8));
  const dayItems = state.transactions
    .filter((item) => item.date === state.selectedDay)
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
  el.selectedDayTitle.textContent = `${state.selectedDay} 记录`;
  renderList(el.dayList, dayItems);
}

function renderList(target, items) {
  if (!items.length) {
    target.innerHTML = `<li class="empty-state">没有记录。</li>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const node = el.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".item-title").textContent = item.merchant || item.category;
    node.querySelector(".item-meta").textContent = [
      formatDateTime(item.datetime),
      item.category,
      item.payment,
      item.tag,
      item.note,
    ]
      .filter(Boolean)
      .join(" · ");
    node.querySelector(".item-amount").textContent = `${item.type === "income" ? "+" : "-"}${money(item.amount)}`;
    node.querySelector(".item-amount").classList.add(item.type === "income" ? "income" : "expense");
    node.querySelector(".delete-button").addEventListener("click", () => deleteTransaction(item.id));
    fragment.appendChild(node);
  });

  target.innerHTML = "";
  target.appendChild(fragment);
}

function renderCalendar() {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const offset = first.getDay();
  const totals = new Map();

  monthTransactions().forEach((item) => {
    const current = totals.get(item.date) || { income: 0, expense: 0 };
    current[item.type] += item.amount;
    totals.set(item.date, current);
  });

  const cells = [];
  ["日", "一", "二", "三", "四", "五", "六"].forEach((label) => {
    cells.push(`<div class="weekday">${label}</div>`);
  });
  for (let i = 0; i < offset; i += 1) {
    cells.push(`<div class="calendar-day muted"></div>`);
  }
  for (let day = 1; day <= days; day += 1) {
    const date = `${state.selectedMonth}-${String(day).padStart(2, "0")}`;
    const total = totals.get(date);
    const net = total ? total.income - total.expense : 0;
    const tone = net > 0 ? "net-positive" : net < 0 ? "net-negative" : "";
    cells.push(`
      <button class="calendar-day ${date === state.selectedDay ? "active" : ""} ${tone}" data-date="${date}" type="button">
        <strong>${day}</strong>
        <span>${total ? shortMoney(net) : ""}</span>
      </button>
    `);
  }

  el.calendar.innerHTML = cells.join("");
  el.calendar.querySelectorAll("button[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = button.dataset.date;
      renderCalendar();
      renderTransactions();
    });
  });
}

function renderStats() {
  const items = monthTransactions();
  const income = sum(items, "income");
  const expense = sum(items, "expense");
  const daily = expense / Math.max(1, new Date(...state.selectedMonth.split("-").map((v, i) => (i ? Number(v) : Number(v))), 0).getDate());
  const top = topCategory(items);

  el.incomeMetric.textContent = money(income);
  el.expenseMetric.textContent = money(expense);
  el.dailyMetric.textContent = money(daily);
  el.topMetric.textContent = top ? top.category : "暂无";
  renderBarChart(items);
  renderPieChart(items);
  renderTrendChart();
}

function renderBarChart(items) {
  const days = {};
  items.forEach((item) => {
    const day = Number(item.date.slice(8, 10));
    days[day] ||= { income: 0, expense: 0 };
    days[day][item.type] += item.amount;
  });
  const rows = Object.entries(days).sort((a, b) => Number(a[0]) - Number(b[0]));
  const max = Math.max(1, ...rows.flatMap(([, value]) => [value.income, value.expense]));

  el.barChart.innerHTML = rows.length
    ? rows
        .map(([day, value]) => {
          return `
            <article class="bar-group">
              <div class="bar-stack">
                <span class="bar income-bar" style="height:${(value.income / max) * 100}%"></span>
                <span class="bar expense-bar" style="height:${(value.expense / max) * 100}%"></span>
              </div>
              <strong>${day}</strong>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">暂无柱状图数据。</div>`;
}

function renderPieChart(items) {
  const grouped = groupExpenses(items);
  const total = grouped.reduce((acc, item) => acc + item.amount, 0);
  if (!grouped.length) {
    el.pieChart.innerHTML = `<div class="empty-state">暂无饼图数据。</div>`;
    return;
  }

  let cursor = 0;
  const segments = grouped.map((item, index) => {
    const pct = total ? (item.amount / total) * 100 : 0;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const segment = `${color} ${cursor}% ${cursor + pct}%`;
    cursor += pct;
    return { ...item, pct, color, segment };
  });

  el.pieChart.innerHTML = `
    <div class="donut" style="background: conic-gradient(${segments.map((item) => item.segment).join(",")})">
      <div><strong>${money(total)}</strong><span>支出</span></div>
    </div>
    <div class="legend-list">
      ${segments
        .map(
          (item) => `
            <article>
              <span class="legend-dot" style="background:${item.color}"></span>
              <strong>${escapeHtml(item.category)}</strong>
              <em>${money(item.amount)} · ${item.pct.toFixed(0)}%</em>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTrendChart() {
  const months = lastTwelveMonths();
  const values = months.map((month) => {
    const expense = sum(state.transactions.filter((item) => item.datetime.startsWith(month)), "expense");
    return { month, expense };
  });
  const max = Math.max(1, ...values.map((item) => item.expense));
  const points = values.map((item, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 100 - (item.expense / max) * 82 - 8;
    return `${x},${y}`;
  });

  el.trendChart.innerHTML = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="12个月消费趋势">
      <polyline points="${points.join(" ")}"></polyline>
    </svg>
    <div class="trend-labels">
      <span>${months[0].slice(5)}月</span>
      <span>${months.at(-1).slice(5)}月</span>
    </div>
  `;
}

function renderAiLocalAdvice() {
  if (el.aiResult.dataset.remote === "true") {
    return;
  }

  const summary = buildSummary();
  const advice = [];
  if (!summary.count) {
    advice.push("先连续记满两周，AI 才能看出你的真实生活节奏。");
  } else {
    advice.push(`本月支出 ${money(summary.expense)}，收入 ${money(summary.income)}，结余 ${money(summary.balance)}。`);
    if (summary.topExpense) {
      advice.push(`最需要盯住的是 ${summary.topExpense.category}，已经花了 ${money(summary.topExpense.amount)}。`);
    }
    if ((summary.byCategory["订阅服务"] || 0) > 50) {
      advice.push("订阅服务已经有存在感，建议每月固定清理一次自动扣费。");
    }
    if ((summary.byCategory["油费"] || 0) + (summary.byCategory["Toll Fee"] || 0) > summary.expense * 0.12) {
      advice.push("油费和 Toll Fee 占比偏高，用车成本可以单独设一个上限。");
    }
    if ((summary.byCategory["投资理财"] || 0) > 0) {
      advice.push("投资理财已经记入账本，建议和日常消费分开看，避免误判真实生活开销。");
    }
  }

  el.aiResult.innerHTML = advice.map((item) => `<p>${escapeHtml(item)}</p>`).join("");
}

async function runAiAnalysis() {
  const apiKey = el.apiKey.value.trim();
  const model = el.model.value.trim() || "gpt-5";
  localStorage.setItem(API_KEY_STORAGE, apiKey);
  localStorage.setItem(MODEL_STORAGE, model);

  if (!apiKey) {
    await copyAiPrompt();
    el.aiResult.dataset.remote = "false";
    el.aiResult.innerHTML = `<p>没有填写 API Key，我已经把分析提示词复制到剪贴板，可以直接粘到 ChatGPT。</p>`;
    return;
  }

  el.aiResult.dataset.remote = "true";
  el.aiResult.innerHTML = `<p>正在让穷人军师思考...</p>`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildAiPrompt(),
        reasoning: { effort: "high" },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API 请求失败");
    }
    const text = extractResponseText(data);
    el.aiResult.innerHTML = `<pre>${escapeHtml(text || "没有收到分析内容。")}</pre>`;
  } catch (error) {
    el.aiResult.dataset.remote = "false";
    el.aiResult.innerHTML = `<p>AI 请求失败：${escapeHtml(error.message)}</p><p>你仍然可以用“复制提示词”手动分析。</p>`;
  }
}

async function copyAiPrompt() {
  await navigator.clipboard.writeText(buildAiPrompt());
  el.aiResult.innerHTML = `<p>分析提示词已复制。打开 ChatGPT 后粘贴即可。</p>`;
}

function buildAiPrompt() {
  const summary = buildSummary();
  return `你是我的纽约生活记账顾问，请用中文分析我的账本，只给具体、可执行的开源节流建议。

App 名字：穷人日记
月份：${state.selectedMonth}
收入：${money(summary.income)}
支出：${money(summary.expense)}
结余：${money(summary.balance)}
交易笔数：${summary.count}
支付方式汇总：${JSON.stringify(summary.byPayment, null, 2)}
支出分类汇总：${JSON.stringify(summary.byCategory, null, 2)}

请输出：
1. 本月钱去哪了
2. 最该警惕的 3 个消费点
3. 下个月可立刻执行的省钱动作
4. 如果住在纽约且有 HOA、房屋贷款、车险、油费、Toll Fee，预算结构应该怎么调
5. 一份下月分类预算`;
}

function buildSummary() {
  const items = monthTransactions();
  const byCategory = {};
  const byPayment = {};
  items.forEach((item) => {
    if (item.type === "expense") {
      byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
    }
    byPayment[item.payment || "未记录"] = (byPayment[item.payment || "未记录"] || 0) + item.amount;
  });

  const income = sum(items, "income");
  const expense = sum(items, "expense");
  return {
    income,
    expense,
    balance: income - expense,
    count: items.length,
    byCategory,
    byPayment,
    topExpense: topCategory(items),
  };
}

function exportExcel() {
  const rows = exportRows();
  const table = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`)
    .join("");
  download(
    `穷人日记-${state.selectedMonth}.xls`,
    `<html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`,
    "application/vnd.ms-excel",
  );
}

function exportCsv() {
  const csv = exportRows()
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  download(`穷人日记-${state.selectedMonth}.csv`, csv, "text/csv;charset=utf-8");
}

function exportJson() {
  download(
    `穷人日记-backup-${today()}.json`,
    JSON.stringify({ app: "穷人日记", version: 1, transactions: state.transactions }, null, 2),
    "application/json",
  );
}

function restoreJson(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const transactions = Array.isArray(data) ? data : data.transactions;
      if (!Array.isArray(transactions)) {
        throw new Error("备份文件格式不对");
      }
      state.transactions = transactions.map(migrate).sort((a, b) => b.datetime.localeCompare(a.datetime));
      persist();
      renderAll();
      el.aiResult.innerHTML = `<p>备份已恢复，共 ${state.transactions.length} 笔。</p>`;
    } catch (error) {
      el.aiResult.innerHTML = `<p>恢复失败：${escapeHtml(error.message)}</p>`;
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function exportRows() {
  const header = ["日期", "类型", "收支", "金额", "支付方式", "商家", "标签", "备注"];
  const rows = state.transactions
    .slice()
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
    .map((item) => [
      item.datetime,
      item.category,
      item.type === "income" ? "收入" : "支出",
      item.amount,
      item.payment || "",
      item.merchant || "",
      item.tag || "",
      item.note || "",
    ]);
  return [header, ...rows];
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((item) => item.id !== id);
  persist();
  renderAll();
}

function monthTransactions() {
  return state.transactions.filter((item) => item.datetime.startsWith(state.selectedMonth));
}

function sum(items, type) {
  return items.filter((item) => item.type === type).reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function groupExpenses(items) {
  const map = new Map();
  items
    .filter((item) => item.type === "expense")
    .forEach((item) => map.set(item.category, (map.get(item.category) || 0) + item.amount));
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function topCategory(items) {
  return groupExpenses(items)[0];
}

function migrate(item) {
  const datetime = normalizeDatetime(item.datetime || item.date || today());
  const amount = Math.abs(Number(item.amount || 0));
  const rawType = item.type === "income" || item.type === "expense" ? item.type : Number(item.amount || 0) < 0 ? "expense" : "income";
  const type = amount === 0 ? "expense" : rawType;
  const category = CATEGORY_MIGRATION[item.category] || item.category || "其他";
  const validCategory = CATEGORIES[type].includes(category) ? category : type === "income" ? "其他" : "其他";

  return {
    id: item.id || crypto.randomUUID(),
    type,
    amount,
    datetime,
    date: datetime.slice(0, 10),
    category: validCategory,
    payment: PAYMENTS.includes(item.payment) ? item.payment : "Credit Card",
    merchant: item.merchant || "",
    tag: item.tag || "必要",
    note: item.note || "",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function seedTransactions() {
  const month = currentMonth();
  return [
    sample("income", 6200, `${month}-01T09:00`, "工资", "公司", "ACH / Bank Transfer", "工资到账"),
    sample("expense", 1280, `${month}-02T10:20`, "房屋贷款", "Mortgage", "ACH / Bank Transfer", "月供"),
    sample("expense", 410, `${month}-03T08:30`, "HOA", "HOA", "ACH / Bank Transfer", "管理费"),
    sample("expense", 96.4, `${month}-04T18:10`, "油费", "Costco Gas", "Credit Card", "加油"),
    sample("expense", 18.75, `${month}-05T09:40`, "Toll Fee", "E-ZPass", "Credit Card", "过桥"),
    sample("expense", 142.2, `${month}-06T19:10`, "买菜超市", "Trader Joe's", "Apple Pay", "一周买菜"),
    sample("expense", 38.6, `${month}-07T12:20`, "外食", "Lunch Special", "Credit Card", "午饭"),
    sample("expense", 29.99, `${month}-08T07:30`, "订阅服务", "Streaming", "Credit Card", "自动扣费"),
    sample("income", 260, `${month}-10T16:30`, "投资收益", "Brokerage", "ACH / Bank Transfer", "分红"),
  ];
}

function sample(type, amount, datetime, category, merchant, payment, note) {
  return {
    id: crypto.randomUUID(),
    type,
    amount,
    datetime,
    date: datetime.slice(0, 10),
    category,
    merchant,
    payment,
    tag: category === "投资收益" ? "投资" : "必要",
    note,
    createdAt: new Date().toISOString(),
  };
}

function readStorage(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function fillNow() {
  el.datetime.value = datetimeLocal();
}

function normalizeDatetime(value) {
  return value.includes("T") ? value.slice(0, 16) : `${value.slice(0, 10)}T12:00`;
}

function datetimeLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function currentMonth() {
  return datetimeLocal().slice(0, 7);
}

function today() {
  return datetimeLocal().slice(0, 10);
}

function lastTwelveMonths() {
  const now = new Date(`${state.selectedMonth}-01T12:00`);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function shortMoney(value) {
  if (!value) {
    return "";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}$${Math.round(value)}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function extractResponseText(data) {
  if (data.output_text) {
    return data.output_text;
  }

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  }
}

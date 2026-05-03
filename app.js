const STORAGE_KEY = "cosmic-life-state-v1";

const initialState = {
  theme: "cosmos",
  tasks: [
    { id: crypto.randomUUID(), title: "Boire un grand verre d'eau", done: false },
    { id: crypto.randomUUID(), title: "Choisir 3 priorites pour aujourd'hui", done: false }
  ],
  budget: [
    { id: crypto.randomUUID(), label: "Courses", amount: 45, type: "expense" },
    { id: crypto.randomUUID(), label: "Revenu", amount: 1200, type: "income" }
  ],
  lists: [
    {
      id: crypto.randomUUID(),
      title: "A ne pas oublier",
      items: [
        { id: crypto.randomUUID(), title: "Chargeur", done: false },
        { id: crypto.randomUUID(), title: "Clefs", done: false }
      ]
    }
  ],
  notes: [
    { id: crypto.randomUUID(), text: "Une idee par jour suffit pour avancer.", createdAt: Date.now() }
  ]
};

let state = loadState();

const views = {
  tasks: document.querySelector("#tasksView"),
  budget: document.querySelector("#budgetView"),
  lists: document.querySelector("#listsView"),
  notes: document.querySelector("#notesView")
};

const tabs = [...document.querySelectorAll(".tab")];
const formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

document.querySelector("#todayLabel").textContent = dateFormatter.format(new Date());
document.querySelector("#themeToggle").addEventListener("click", toggleTheme);
document.querySelector("#taskForm").addEventListener("submit", addTask);
document.querySelector("#budgetForm").addEventListener("submit", addBudgetItem);
document.querySelector("#listForm").addEventListener("submit", addCollection);
document.querySelector("#noteForm").addEventListener("submit", addNote);

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

render();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialState;
  } catch {
    return initialState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  document.documentElement.dataset.theme = state.theme === "forest" ? "forest" : "cosmos";
  renderTasks();
  renderBudget();
  renderCollections();
  renderNotes();
}

function setView(viewName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  Object.entries(views).forEach(([name, view]) => view.classList.toggle("active", name === viewName));
}

function toggleTheme() {
  state.theme = state.theme === "forest" ? "cosmos" : "forest";
  saveState();
  render();
}

function addTask(event) {
  event.preventDefault();
  const input = document.querySelector("#taskInput");
  const title = input.value.trim();
  if (!title) return;
  state.tasks.unshift({ id: crypto.randomUUID(), title, done: false });
  input.value = "";
  saveState();
  renderTasks();
}

function renderTasks() {
  const list = document.querySelector("#tasksList");
  const doneCount = state.tasks.filter((task) => task.done).length;
  const total = state.tasks.length;
  document.querySelector("#taskMetric").textContent = `${doneCount}/${total}`;
  updateProgress(total ? Math.round((doneCount / total) * 100) : 0);

  if (!total) {
    renderEmpty(list, "Rien pour l'instant", "Ajoute une premiere tache pour poser la journee.");
    return;
  }

  list.replaceChildren(...state.tasks.map((task) => createItem({
    title: task.title,
    done: task.done,
    onToggle: () => {
      task.done = !task.done;
      saveState();
      renderTasks();
    },
    onDelete: () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState();
      renderTasks();
    }
  })));
}

function updateProgress(percent) {
  const circle = document.querySelector("#progressCircle");
  const circumference = 314;
  circle.style.strokeDashoffset = String(circumference - (percent / 100) * circumference);
  document.querySelector("#progressPercent").textContent = `${percent}%`;
}

function addBudgetItem(event) {
  event.preventDefault();
  const labelInput = document.querySelector("#budgetLabel");
  const amountInput = document.querySelector("#budgetAmount");
  const typeInput = document.querySelector("#budgetType");
  const label = labelInput.value.trim();
  const amount = Number(amountInput.value);

  if (!label || !Number.isFinite(amount) || amount <= 0) return;

  state.budget.unshift({
    id: crypto.randomUUID(),
    label,
    amount,
    type: typeInput.value
  });

  labelInput.value = "";
  amountInput.value = "";
  saveState();
  renderBudget();
}

function renderBudget() {
  const list = document.querySelector("#budgetList");
  const income = state.budget.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = state.budget.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  document.querySelector("#incomeTotal").textContent = formatter.format(income);
  document.querySelector("#expenseTotal").textContent = formatter.format(expenses);
  document.querySelector("#balanceTotal").textContent = formatter.format(income - expenses);

  if (!state.budget.length) {
    renderEmpty(list, "Budget vide", "Ajoute une entree ou une depense pour voir ton reste.");
    return;
  }

  list.replaceChildren(...state.budget.map((entry) => {
    const item = document.createElement("article");
    item.className = "item";

    const row = document.createElement("div");
    row.className = "item-row";

    const marker = document.createElement("span");
    marker.className = "check";
    marker.textContent = entry.type === "income" ? "+" : "-";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = entry.label;

    const amount = document.createElement("strong");
    amount.className = `amount ${entry.type}`;
    amount.textContent = formatter.format(entry.amount);

    const remove = createDeleteButton(() => {
      state.budget = state.budget.filter((itemBudget) => itemBudget.id !== entry.id);
      saveState();
      renderBudget();
    });

    row.append(marker, title, amount);
    item.append(row, remove);
    return item;
  }));
}

function addCollection(event) {
  event.preventDefault();
  const input = document.querySelector("#listInput");
  const title = input.value.trim();
  if (!title) return;
  state.lists.unshift({ id: crypto.randomUUID(), title, items: [] });
  input.value = "";
  saveState();
  renderCollections();
}

function renderCollections() {
  const container = document.querySelector("#collections");
  if (!state.lists.length) {
    renderEmpty(container, "Aucune liste", "Cree une liste de courses, valise, rendez-vous ou idees.");
    return;
  }

  container.replaceChildren(...state.lists.map((collection) => {
    const card = document.createElement("article");
    card.className = "collection";

    const head = document.createElement("div");
    head.className = "collection-head";

    const title = document.createElement("strong");
    title.className = "item-title";
    title.textContent = collection.title;

    const remove = createDeleteButton(() => {
      state.lists = state.lists.filter((list) => list.id !== collection.id);
      saveState();
      renderCollections();
    });

    const items = document.createElement("div");
    items.className = "collection-items";
    collection.items.forEach((listItem) => {
      items.append(createItem({
        title: listItem.title,
        done: listItem.done,
        onToggle: () => {
          listItem.done = !listItem.done;
          saveState();
          renderCollections();
        },
        onDelete: () => {
          collection.items = collection.items.filter((item) => item.id !== listItem.id);
          saveState();
          renderCollections();
        }
      }));
    });

    const form = document.createElement("form");
    form.className = "collection-form";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("input");
      const value = input.value.trim();
      if (!value) return;
      collection.items.push({ id: crypto.randomUUID(), title: value, done: false });
      input.value = "";
      saveState();
      renderCollections();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ajouter un element";
    input.setAttribute("aria-label", `Ajouter un element a ${collection.title}`);

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "small-action";
    button.textContent = "Ajouter";

    form.append(input, button);
    head.append(title, remove);
    card.append(head, items, form);
    return card;
  }));
}

function addNote(event) {
  event.preventDefault();
  const input = document.querySelector("#noteInput");
  const text = input.value.trim();
  if (!text) return;
  state.notes.unshift({ id: crypto.randomUUID(), text, createdAt: Date.now() });
  input.value = "";
  saveState();
  renderNotes();
}

function renderNotes() {
  const list = document.querySelector("#notesList");
  if (!state.notes.length) {
    renderEmpty(list, "Aucune note", "Garde ici les idees qui passent vite.");
    return;
  }

  list.replaceChildren(...state.notes.map((note) => {
    const item = document.createElement("article");
    item.className = "item";

    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "1fr auto";

    const text = document.createElement("p");
    text.className = "item-title";
    text.textContent = note.text;

    const remove = createDeleteButton(() => {
      state.notes = state.notes.filter((itemNote) => itemNote.id !== note.id);
      saveState();
      renderNotes();
    });

    row.append(text, remove);
    item.append(row);
    return item;
  }));
}

function createItem({ title, done, onToggle, onDelete }) {
  const item = document.createElement("article");
  item.className = `item${done ? " done" : ""}`;

  const row = document.createElement("div");
  row.className = "item-row";

  const check = document.createElement("button");
  check.className = "check";
  check.type = "button";
  check.setAttribute("aria-label", done ? "Marquer comme a faire" : "Marquer comme fait");
  check.textContent = done ? "✓" : "";
  check.addEventListener("click", onToggle);

  const text = document.createElement("span");
  text.className = "item-title";
  text.textContent = title;

  const remove = createDeleteButton(onDelete);
  row.append(check, text, remove);
  item.append(row);
  return item;
}

function createDeleteButton(onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-button";
  button.setAttribute("aria-label", "Supprimer");
  button.textContent = "×";
  button.addEventListener("click", onClick);
  return button;
}

function renderEmpty(container, title, body) {
  const template = document.querySelector("#emptyTemplate");
  const empty = template.content.cloneNode(true);
  empty.querySelector("strong").textContent = title;
  empty.querySelector("span").textContent = body;
  container.replaceChildren(empty);
}

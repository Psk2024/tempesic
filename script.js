// ---------------- Firebase setup ----------------
const firebaseConfig = {
  apiKey: "AIzaSyBl0JbugtktEVUP-Pdg6Rl0nzK9u10aN2c",
  authDomain: "empdb-2c5bb.firebaseapp.com",
  projectId: "empdb-2c5bb",
  storageBucket: "empdb-2c5bb.appspot.com",
  messagingSenderId: "94024514062",
  appId: "1:94024514062:web:431c9908b5f6afc1949a5f",
  measurementId: "G-JX251BG0G2"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const empCollection = db.collection("employees");

// ---------------- State ----------------
let employees = [];             // all documents from Firestore
let editingId = null;           // current doc id in modal (null = new)
let currentGroupFilter = null;  // null = all groups
let currentStatusFilter = null; // { field, value } or null

// ---------------- DOM references ----------------
// Top bar
const empCountLabel  = document.getElementById("empCount");
const statusText     = document.getElementById("statusText");
const addEmpBtn      = document.getElementById("addEmpBtn");
const searchInput    = document.getElementById("searchInput");
const downloadBtn    = document.getElementById("downloadBtn");

// Dashboard
const dashCardRow    = document.getElementById("dashCardRow");

// Table body
const empTableBody   = document.getElementById("empTableBody");

// Modal / form
const modalOverlay   = document.getElementById("modalOverlay");
const modalCloseBtn  = document.getElementById("modalCloseBtn");
const modalTitle     = document.getElementById("modalTitle");
const modalStatus    = document.getElementById("modalStatus");
const editBadge      = document.getElementById("editBadge");

// Form fields
const empIdInput       = document.getElementById("empId");
const empNameInput     = document.getElementById("empName");
const empDesignationInput = document.getElementById("empDesignation");
const empGroupInput    = document.getElementById("empGroup");
const empBranchInput   = document.getElementById("empBranch");
const empGenderInput   = document.getElementById("empGender");
const empDobInput      = document.getElementById("empDob");
const empRetirementInput = document.getElementById("empRetirement");
const empDojBranchInput  = document.getElementById("empDojBranch");
const empDojAUInput      = document.getElementById("empDojAU");
const empContactInput    = document.getElementById("empContact");

const empProbationStatusInput   = document.getElementById("empProbationStatus");
const empCharacterStatusInput   = document.getElementById("empCharacterStatus");
const empCasteStatusInput       = document.getElementById("empCasteStatus");
const empConfirmationStatusInput= document.getElementById("empConfirmationStatus");

// Form buttons
const saveBtn   = document.getElementById("saveBtn");
const clearBtn  = document.getElementById("clearBtn");
const deleteBtn = document.getElementById("deleteBtn");
const editBtn   = document.getElementById("editBtn");

// CSV import
const importBtn    = document.getElementById("importBtn");
const csvFileInput = document.getElementById("csvFileInput");

// ---------------- Helpers ----------------
function setStatus(msg) {
  statusText.textContent = msg || "";
}
function setModalStatus(msg) {
  if (modalStatus) modalStatus.textContent = msg || "";
}

function openForm(isEdit) {
  modalOverlay.classList.add("active");
  modalTitle.textContent = isEdit ? "View Employee" : "Add Employee";
  setModalStatus("");
}
function closeForm() {
  modalOverlay.classList.remove("active");
}

function setGroupFilter(groupKeyOrNull) {
  currentGroupFilter = groupKeyOrNull;
  renderTable();
  updateDashboard();
  updateStatusCards();
}

function setStatusFilter(field, value) {
  if (field && value) {
    currentStatusFilter = { field, value };
  } else {
    currentStatusFilter = null;
  }
  renderTable();
  updateStatusCards();
}

// all form inputs/selects for toggling read-only
const textInputs = [
  empIdInput, empNameInput, empDesignationInput, empGroupInput,
  empBranchInput, empGenderInput, empDobInput, empRetirementInput,
  empDojBranchInput, empDojAUInput, empContactInput
];
const selectInputs = [
  empProbationStatusInput, empCharacterStatusInput,
  empCasteStatusInput, empConfirmationStatusInput
];

function setFormReadOnly(isReadOnly) {
  textInputs.forEach(el => {
    if (!el) return;
    el.readOnly = isReadOnly;
  });
  selectInputs.forEach(el => {
    if (!el) return;
    el.disabled = isReadOnly;
  });
  // Buttons
  saveBtn.disabled  = isReadOnly;
  clearBtn.disabled = isReadOnly;
}

// ---------------- Firestore: load ----------------
async function loadEmployees() {
  try {
    setStatus("Loading...");
    const snapshot = await empCollection.orderBy("empId").get();
    employees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderTable();
    updateDashboard();
    updateStatusCards();
    setStatus("Loaded " + employees.length + " record(s).");
  } catch (err) {
    console.error("Error loading:", err);
    setStatus("Error loading data. Check console.");
    alert("Error loading data from Firestore.\n" + err.message);
  }
}

// ---------------- Filtering core ----------------
function getFilteredRows() {
  const search = (searchInput.value || "").toLowerCase().trim();

  let rows = employees.slice();

  // Search filter
  if (search) {
    rows = rows.filter(emp => {
      const fields = [
        "empId","name","designation","group","branch",
        "probationStatus","characterStatus","casteStatus","confirmationStatus"
      ];
      return fields.some(f => (emp[f] || "").toLowerCase().includes(search));
    });
  }

  // Group filter (from cards)
  if (currentGroupFilter) {
    rows = rows.filter(emp => {
      const key = (emp.group || "").trim() || "(No Group)";
      return key === currentGroupFilter;
    });
  }

  // Status filter (from pending cards)
  if (currentStatusFilter) {
    const { field, value } = currentStatusFilter;
    rows = rows.filter(emp =>
      (emp[field] || "").toLowerCase() === value.toLowerCase()
    );
  }

  return rows;
}

// ---------------- Render table ----------------
function renderTable() {
  const rows = getFilteredRows();

  empTableBody.innerHTML = "";

  // Unique EmpID count for current view
  const uniqueIds = new Set();
  rows.forEach(emp => {
    const key = (emp.empId || "").trim();
    if (key) uniqueIds.add(key);
  });
  empCountLabel.textContent = uniqueIds.size;

  // Build rows: minimal columns
  rows.forEach((emp, index) => {
    const tr = document.createElement("tr");
    tr.dataset.id = emp.id;
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${emp.empId || ""}</td>
      <td>${emp.name || ""}</td>
      <td>${emp.designation || ""}</td>
      <td>${emp.branch || ""}</td>
    `;
    // Row click = view (read-only) until Edit pressed
    tr.addEventListener("click", () => {
      startEditing(emp.id, true);
      openForm(true);
    });
    empTableBody.appendChild(tr);
  });
}

// ---------------- Group-wise dashboard ----------------
function updateDashboard() {
  const empMap = new Map();
  employees.forEach(emp => {
    const key = (emp.empId || "").trim();
    if (!key) return;
    if (!empMap.has(key)) empMap.set(key, emp);
  });
  const uniqueList = Array.from(empMap.values());
  const totalUnique = uniqueList.length;

  const counts = {};
  uniqueList.forEach(emp => {
    const key = (emp.group || "").trim() || "(No Group)";
    counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));

  dashCardRow.innerHTML = "";

  const allCard = document.createElement("div");
  allCard.className = "dash-summary-card" + (currentGroupFilter === null ? " active" : "");
  allCard.innerHTML = `
    <div class="dash-summary-card-title">All Groups</div>
    <div class="dash-summary-card-count">${totalUnique}</div>
  `;
  allCard.addEventListener("click", () => setGroupFilter(null));
  dashCardRow.appendChild(allCard);

  entries.forEach(([group, count]) => {
    const card = document.createElement("div");
    card.className = "dash-summary-card" + (currentGroupFilter === group ? " active" : "");
    card.innerHTML = `
      <div class="dash-summary-card-title">${group}</div>
      <div class="dash-summary-card-count">${count}</div>
    `;
    card.addEventListener("click", () => setGroupFilter(group));
    dashCardRow.appendChild(card);
  });
}

// ---------------- Status-wise pending cards ----------------
function updateStatusCards() {
  const statusRow = document.getElementById("statusCardRow");
  if (!statusRow) return;

  statusRow.innerHTML = "";

  const statusFilters = [
    { label: "Probation Pending",            field: "probationStatus" },
    { label: "Police Verification Pending",  field: "characterStatus" },
    { label: "Caste Verification Pending",   field: "casteStatus" },
    { label: "Confirmation Pending",         field: "confirmationStatus" }
  ];

  statusFilters.forEach(sf => {
    const count = employees.filter(e =>
      (e[sf.field] || "").toLowerCase() === "pending"
    ).length;

    const isActive =
      currentStatusFilter &&
      currentStatusFilter.field === sf.field &&
      currentStatusFilter.value.toLowerCase() === "pending";

    const card = document.createElement("div");
    card.className = "dash-summary-card" + (isActive ? " active" : "");
    card.innerHTML = `
      <div class="dash-summary-card-title">${sf.label}</div>
      <div class="dash-summary-card-count">${count}</div>
    `;

    // Clicking toggles filter: if same card clicked again, clear status filter
    card.addEventListener("click", () => {
      if (isActive) {
        setStatusFilter(null, null);
      } else {
        setStatusFilter(sf.field, "Pending");
      }
    });

    statusRow.appendChild(card);
  });
}

// ---------------- Form helpers ----------------
function clearForm() {
  empIdInput.value = "";
  empNameInput.value = "";
  empDesignationInput.value = "";
  empGroupInput.value = "";
  empBranchInput.value = "";
  empGenderInput.value = "";
  empDobInput.value = "";
  empRetirementInput.value = "";
  empDojBranchInput.value = "";
  empDojAUInput.value = "";
  empContactInput.value = "";

  empProbationStatusInput.value = "";
  empCharacterStatusInput.value = "";
  empCasteStatusInput.value = "";
  empConfirmationStatusInput.value = "";

  editingId = null;
  deleteBtn.disabled = true;
  editBadge.style.display = "none";
  saveBtn.textContent = "Save";
  modalTitle.textContent = "Add Employee";
  setModalStatus("");

  // New record: editable mode
  setFormReadOnly(false);
  if (editBtn) editBtn.style.display = "none";
}

function startEditing(id, viewOnly) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  editingId = id;
  empIdInput.value = emp.empId || "";
  empNameInput.value = emp.name || "";
  empDesignationInput.value = emp.designation || "";
  empGroupInput.value = emp.group || "";
  empBranchInput.value = emp.branch || "";
  empGenderInput.value = emp.gender || "";
  empDobInput.value = emp.dob || "";
  empRetirementInput.value = emp.retirement || "";
  empDojBranchInput.value = emp.dojBranch || "";
  empDojAUInput.value = emp.dojAU || "";
  empContactInput.value = emp.contact || "";

  empProbationStatusInput.value    = emp.probationStatus    || "";
  empCharacterStatusInput.value    = emp.characterStatus    || "";
  empCasteStatusInput.value        = emp.casteStatus        || "";
  empConfirmationStatusInput.value = emp.confirmationStatus || "";

  deleteBtn.disabled = false;
  saveBtn.textContent = "Update";
  editBadge.style.display = "inline-block";

  if (viewOnly) {
    setFormReadOnly(true);
    if (editBtn) editBtn.style.display = "inline-flex";
  } else {
    setFormReadOnly(false);
    if (editBtn) editBtn.style.display = "none";
  }
}

// ---------------- Save (add / update) ----------------
async function handleSave() {
  const empId = empIdInput.value.trim();
  const name  = empNameInput.value.trim();

  if (!empId || !name) {
    alert("Emp ID and Name are mandatory.");
    return;
  }

  const data = {
    empId,
    name,
    designation:     empDesignationInput.value.trim(),
    group:           empGroupInput.value.trim(),
    branch:          empBranchInput.value.trim(),
    gender:          empGenderInput.value.trim(),
    dob:             empDobInput.value.trim(),
    retirement:      empRetirementInput.value.trim(),
    dojBranch:       empDojBranchInput.value.trim(),
    dojAU:           empDojAUInput.value.trim(),
    contact:         empContactInput.value.trim(),
    probationStatus: empProbationStatusInput.value,
    characterStatus: empCharacterStatusInput.value,
    casteStatus:     empCasteStatusInput.value,
    confirmationStatus: empConfirmationStatusInput.value
  };

  saveBtn.disabled = true;
  saveBtn.textContent = editingId ? "Updating..." : "Saving...";
  setModalStatus("Saving to database...");

  try {
    if (editingId) {
      await empCollection.doc(editingId).set(data, { merge: true });
    } else {
      await empCollection.add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    setModalStatus("Reloading data...");
    await loadEmployees();

    alert("Record saved successfully.");
    clearForm();
    closeForm();
  } catch (err) {
    console.error("Error saving:", err);
    alert("Error saving data.\n" + err.message);
    setModalStatus("Error saving.");
  }

  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
}

// ---------------- Delete (from modal) ----------------
async function handleDelete() {
  if (!editingId) return;
  if (!confirm("Are you sure you want to delete this record?")) return;

  try {
    setStatus("Deleting...");
    await empCollection.doc(editingId).delete();
    await loadEmployees();
    clearForm();
    closeForm();
    setStatus("Deleted successfully.");
  } catch (err) {
    console.error("Error deleting:", err);
    alert("Error deleting data.\n" + err.message);
    setStatus("Error deleting.");
  }
}

// ---------------- CSV helpers ----------------
function splitCsvRow(row) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
        current += '"'; i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += ch;
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length <= 1) return [];
  const rows = [];
  // We ignore date columns now; only keep statuses
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    if (!cols.length) continue;
    rows.push({
      empId:              (cols[0]  || "").trim(),
      name:               (cols[1]  || "").trim(),
      designation:        (cols[2]  || "").trim(),
      group:              (cols[3]  || "").trim(),
      branch:             (cols[4]  || "").trim(),
      gender:             (cols[5]  || "").trim(),
      dob:                (cols[6]  || "").trim(),
      retirement:         (cols[7]  || "").trim(),
      dojBranch:          (cols[8]  || "").trim(),
      dojAU:              (cols[9] || "").trim(),
      contact:            (cols[10] || "").trim(),
      probationStatus:    (cols[11] || "").trim(),
      characterStatus:    (cols[12] || "").trim(),
      casteStatus:        (cols[13] || "").trim(),
      confirmationStatus: (cols[14] || "").trim()
    });
  }
  return rows;
}

function handleCsvFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm("Import employees from file: " + file.name + " ?")) {
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = async e => {
    const text = e.target.result;
    const rows = parseCsv(text);
    if (!rows.length) {
      alert("No valid rows found in CSV.");
      csvFileInput.value = "";
      return;
    }
    try {
      setStatus("Importing " + rows.length + " record(s)...");
      for (const row of rows) {
        if (!row.empId && !row.name) continue;
        await empCollection.add({
          ...row,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      await loadEmployees();
      setStatus("Imported " + rows.length + " record(s).");
    } catch (err) {
      console.error("Error importing CSV:", err);
      alert("Error importing CSV.\n" + err.message);
      setStatus("Error importing.");
    } finally {
      csvFileInput.value = "";
    }
  };
  reader.readAsText(file);
}

// ---------------- Download filtered data as Excel (CSV) ----------------
function downloadFilteredToExcel() {
  const rows = getFilteredRows();
  if (!rows.length) {
    alert("No records to download for current filters.");
    return;
  }

  const header = [
    "Emp ID","Name","Designation","Group","Branch","Gender","DoB",
    "Retirement","DoJ (Branch)","DoJ (AU)","Contact",
    "Probation Status","Police Verification Status",
    "Caste Verification Status","Confirmation Status"
  ];

  const csvLines = [header.join(",")];

  rows.forEach(emp => {
    const cols = [
      emp.empId || "",
      emp.name || "",
      emp.designation || "",
      emp.group || "",
      emp.branch || "",
      emp.gender || "",
      emp.dob || "",
      emp.retirement || "",
      emp.dojBranch || "",
      emp.dojAU || "",
      emp.contact || "",
      emp.probationStatus || "",
      emp.characterStatus || "",
      emp.casteStatus || "",
      emp.confirmationStatus || ""
    ];
    const escaped = cols.map(v => {
      v = String(v).replace(/"/g, '""');
      return /[",\n]/.test(v) ? `"${v}"` : v;
    });
    csvLines.push(escaped.join(","));
  });

  const blob = new Blob([csvLines.join("\r\n")], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employees_filtered.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------- Event wiring ----------------
addEmpBtn.addEventListener("click", () => {
  clearForm();
  openForm(false);
});

saveBtn.addEventListener("click", handleSave);
clearBtn.addEventListener("click", clearForm);
deleteBtn.addEventListener("click", handleDelete);

editBtn.addEventListener("click", () => {
  // Switch from view-only to edit mode
  setFormReadOnly(false);
  editBtn.style.display = "none";
  modalTitle.textContent = "Edit Employee";
  setModalStatus("Edit mode enabled.");
});

searchInput.addEventListener("input", renderTable);

downloadBtn.addEventListener("click", downloadFilteredToExcel);

importBtn.addEventListener("click", () => csvFileInput.click());
csvFileInput.addEventListener("change", handleCsvFileChange);

modalCloseBtn.addEventListener("click", () => { closeForm(); });
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) closeForm(); });

// ---------------- Init ----------------
loadEmployees();

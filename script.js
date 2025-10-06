const headerColors = ['Tomato', 'DodgerBlue', 'SlateBlue', '#fce4ec', '#ede7f6', '#e8eaf6'];
const apiKey = 'AIzaSyBLOOYaN0zUBPUkA0FyPot1QL-LFWCpEzc';
const spreadsheetId = '1a4JmwnRPvVHOh5BNOZ-F_sqspasdcowRB7uF-qScd48';
const employeeRange = 'Employees2!A1:K';

let allData = [];
let filteredData = [];
let totalEmployeeCount = 0; 

const select = document.getElementById('cadreSelect');
const searchInput = document.getElementById('searchInput');
const container = document.getElementById('employeeTableContainer');
// ✅ NEW: Get a reference to the new overall count element
const overallCountElement = document.getElementById('overallCountDisplay');

// Fetch and initialize data
async function fetchData() {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${employeeRange}?key=${apiKey}`);
    const data = await res.json();
    const rows = data.values || [];
    if (!rows.length) {
      container.innerHTML = '<p>No employee data found.</p>';
      return;
    }

    allData = rows.slice(1); // exclude header row
    
    const uniqueAllIds = new Set(allData.map(row => row[0]));
    totalEmployeeCount = uniqueAllIds.size; 

    const cadreSet = new Set(allData.map(row => row[4]).filter(Boolean));
    populateCadreOptions([...cadreSet].sort());

    filterAndDisplay();
  } catch (error) {
    console.error('Fetch error:', error);
    container.innerHTML = '<p>⚠️ Unable to load employee data.</p>';
  }
}

// Populate cadre select options
function populateCadreOptions(cadres) {
  select.innerHTML = '<option value="">All Branches</option>';
  cadres.forEach(cadre => {
    const option = document.createElement('option');
    option.value = cadre;
    option.textContent = cadre;
    select.appendChild(option);
  });
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Highlight search term in text
function highlight(text, searchTerm) {
  if (!searchTerm) return text;
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[]\\]/g, '\\$&'); // escape RegExp special chars
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  return text.replace(regex, '<mark style="background-color: #ffd54f; font-weight: 700; color: #5d4300; padding: 0;">$1</mark>');
}

// ⭐️ NEW FUNCTION: Updates the banner with the overall unique count
function updateOverallCountDisplay() {
  if (overallCountElement) {
    overallCountElement.innerHTML = `
      <p style="
        text-align: center; 
        margin: 0 0 0px; 
        font-size: 0.7em; 
        font-weight: 70; 
        color: #0056b3; 
        padding: 0px 0px;
      ">
        (Total: ${totalEmployeeCount})
      </p>
    `;
  }
}

// Filter and display employees based on search and cadre
function filterAndDisplay() {
  const selectedCadre = select.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  filteredData = allData.filter(row => {
    const matchesCadre = selectedCadre ? row[4] === selectedCadre : true;
    const matchesSearch = searchTerm ? 
      (row[0]?.toLowerCase().includes(searchTerm) || row[1]?.toLowerCase().includes(searchTerm) || row[4]?.toLowerCase().includes(searchTerm))
      : true;
    return matchesCadre && matchesSearch;
  });

  const uniqueFilteredIds = new Set(filteredData.map(row => row[0]));
  totalEmployeeCount = uniqueFilteredIds.size; 
  
  updateOverallCountDisplay(); 

  if (!filteredData.length) {
    container.innerHTML = '<p>No employees found.</p>';
    return;
  }

  displayAll();
}

// Display employees grouped by place with clickable rows
function displayAll() {
  const searchTerm = searchInput.value.trim();
  const grouped = filteredData.reduce((group, row) => {
    const place = row[3] || 'Unknown';
    (group[place] ||= []).push(row);
    return group;
  }, {});

  let colorIndex = 0;
  let html = '';
  let globalIndex = 0;
  
  for (const [place, placeData] of Object.entries(grouped)) {
    const bgColor = headerColors[colorIndex % headerColors.length];
    colorIndex++;
    
    const uniqueGroupIds = new Set(placeData.map(row => row[0]));
    const groupCount = uniqueGroupIds.size;

    html += `<h2 style="font-size: 1.5em; margin: 30px auto 10px; width: 90%; text-align: left; padding-left: 10px; border-bottom: 2px solid ${bgColor}; color:${bgColor}">
      ${place}</h2>`;
    
    html += `<table style="width: 90%; margin: 10px auto 0; border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 16px; box-shadow: 0 8px 20px rgba(0, 86, 179, 0.15); overflow: hidden;" role="table" aria-label="Employees in ${place}"><thead><tr>`;
    ['Employee ID', 'Name of the Officer/Official', 'Designation', 'Branch'].forEach(header => {
      html += `<th style="padding: 14px 20px; text-align: center; font-weight: 700; font-size: 16px; background-color: #0056b3; color: #fff; letter-spacing: 0.05em;">${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    placeData.forEach((row) => {
      const rowBg = globalIndex % 2 === 1 ? '#f9faff' : '#ffffff';
      html += `<tr tabindex="0" class="clickable-row" data-employee-id="${row[0] || ''}" data-row-index="${globalIndex}" style="cursor: pointer; transition: background 0.3s ease; background-color: ${rowBg};">`;
      const tdStyle = "padding: 14px 20px; text-align: left; font-weight: 500; font-size: 16px; border-bottom: 1px solid #e0e0e0;";
      const tdStyleCer = "padding: 14px 20px; text-align: center; font-weight: 500; font-size: 16px; border-bottom: 1px solid #e0e0e0;";
      html += `<td style="${tdStyleCer}">${highlight(row[0] || '', searchTerm)}</td>`;
      html += `<td style="${tdStyle}">${highlight(row[1] || '', searchTerm)}</td>`;
      html += `<td style="${tdStyle}">${row[2] || ''}</td>`;
      html += `<td style="${tdStyle}">${highlight(row[4] || '', searchTerm)}</td>`;
      html += '</tr>';
      globalIndex++;
    });
    html += '</tbody></table>';
    
    html += `<p class="group-count-display" style="
      text-align: right; 
      width: 80%; 
      margin: 0 auto 30px; 
      padding: 12px 20px; 
      font-size: 1.1em; 
      font-weight: 700; 
      color: #111; 
      background-color: #f0f8ff; 
      border: 1px solid #d9e7ff; 
      border-top: none; 
      border-bottom-left-radius: 16px; 
      border-bottom-right-radius: 16px;
      box-shadow: 0 4px 10px rgba(0, 86, 179, 0.08); 
    ">
      No. of ${place} Officers/Officials: <span style="color: ${bgColor}; font-size: 1.1em; margin-left: 10px;">${groupCount}</span>
    </p>`;
  }
  
  container.innerHTML = html;

  // Attach click event listeners to open modal
  document.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      const employeeId = row.getAttribute('data-employee-id');
      const rowIndex = Number(row.getAttribute('data-row-index'));
      showEmployeeModal(employeeId, rowIndex);
    });
  });
}

function showEmployeeModal(employeeId, rowIndex) {
  if (!employeeId) return;
  
  const emp = filteredData[rowIndex];
  if (!emp) {
    console.error('Employee not found for ID:', employeeId, 'at filteredData index:', rowIndex);
    return;
  }

  const modal = document.getElementById('employeeModal');
  const modalBody = document.getElementById('modalBody');
  const employeeIdfor = emp[0] || '';
  const imageUrl = employeeIdfor ? `images/${employeeIdfor}.jpg` : ''; // Use empty string to trigger clean SVG fallback
  
  
  const primaryColor = '#0056b3';
  const labelColor = '#333';
  const detailColor = '#111';
  const accentColor = '#e0e7f7';
  
  modalBody.innerHTML = `
   <div style="
    text-align: left; 
    padding-bottom: 15px; 
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
  ">
    <h3 style="
      margin: 0; 
      font-size: 2.2em; 
      color: ${primaryColor}; 
      font-weight: 700;
    ">${emp[1]}</h3>
    <span style="
      font-size: 1.05em; 
      color: #666; 
      display: block; 
      margin-top: 5px;
    ">${emp[2]}</span>
  </div>
  <div id="modal-details-content" style="
    display: flex; 
    gap: 25px; 
    align-items: flex-start; 
    padding: 20px; 
    border-radius: 12px; 
    background: #fcfcfc; 
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
  ">      
 
    <div id="modal-image-wrapper" style="
      flex: 0 0 175px; 
      display: flex; 
      justify-content: center; 
      align-items: center;
      height: 175px;
      background-color: ${accentColor};
      border-radius: 40%;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    ">
  ${imageUrl ? 
        `<img src="${imageUrl}" alt="Photograph of ${name}" style="
            width: 100%; 
            height: 100%; 
            border-radius: 50%; 
            object-fit: cover; 
            border: 3px solid ${primaryColor};
        " onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'${primaryColor}\\' opacity=\\'0.7\\'><path d=\\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\\' style=\\'fill: ${primaryColor};\\'/></svg>'; this.style.backgroundColor='${accentColor}'; this.style.border='none'; this.style.padding='20%';">`
        : 
        `<svg style="width: 80%; height: 80%; fill: ${primaryColor}; opacity: 0.7;" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
      }
      
      </div>
    <div id="modal-info-grid" style="
      flex: 1; 
      display: grid; 
      grid-template-columns: minmax(120px, 40%) 1fr; 
      row-gap: 12px; 
      column-gap: 20px; 
      font-size: 1em; 
      color: ${detailColor}; 
      text-align: left; 
      word-break: break-word;
    ">
      <div style="font-weight: 600; color: ${labelColor};">Employee ID</div>
      <div style="font-weight: 400;">${emp[0] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">Contact Details</div>
      <div style="font-weight: 400;">${emp[10] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">Gender</div>
      <div style="font-weight: 400;">${emp[5] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">Branch</div>
      <div style="font-weight: 400;">${emp[4] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">DoJ in Branch</div>
      <div style="font-weight: 400;">${emp[8] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">Date of Birth</div>
      <div style="font-weight: 400;">${emp[6] || 'N/A'}</div>

      <div style="font-weight: 600; color: ${labelColor};">Date of Retirement</div>
      <div style="font-weight: 400;">${emp[7] || 'N/A'}</div>
    </div>
  </div>
  <style>
    /* Responsive styles for inline elements */
    @media (max-width: 600px) {
      #modal-details-content {
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      #modal-image-wrapper {
        margin-bottom: 5px;
      }
      #modal-info-grid {
        grid-template-columns: 1fr; 
        text-align: center;
        width: 100%;
      }
      #modal-info-grid > div {
        padding: 5px 0;
      }
    }
  </style>
  `;

  modal.style.display = 'block';
}

// Modal close handlers
const modal = document.getElementById('employeeModal');
const closeBtn = modal.querySelector('.close-btn');

closeBtn.onclick = () => {
  modal.style.display = 'none';
};

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
};

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    modal.style.display = 'none';
  }
});

// Initialize fetch and setup event listeners
select.addEventListener('change', filterAndDisplay);
searchInput.addEventListener('input', debounce(filterAndDisplay, 300));

fetchData();
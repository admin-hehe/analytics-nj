const webAppUrl = "/api";
    let globalData = [];
    let masterList = [];
    let currentDisplayedData = [];
    let brandMaster = [];
    let isEditMode = false;
    let selectedIndex = null;
    let activeSuggestRow = null;
    let waWindowReference = null;

    window.onload = () => {
      fetchData();
      document.addEventListener('keydown', (e) => {
  if (e.key === "Escape") {
    if (activeSuggestRow !== null) {
      const activeBox = document.getElementById(`suggest-${activeSuggestRow}`);
      if (activeBox && !activeBox.classList.contains('hidden')) {
        activeBox.classList.add('hidden');
        activeSuggestRow = null;
        return;
      }
    }
    closeModal();
  }
});
    };
    
    document.addEventListener('click', (e) => {
  if (!e.target.closest('.product-input') && !e.target.closest('.suggestion-box')) {
    document.querySelectorAll('.suggestion-box').forEach(box => box.classList.add('hidden'));
    activeSuggestRow = null;
  }
});

    async function fetchData() {
      try {
        const response = await fetch(webAppUrl);
        const json = await response.json();
        globalData = json.rekapData.reverse();
        masterList = json.masterList;
        brandMaster = json.brandList;
        
        currentDisplayedData = globalData;
        populateMasterDatalist();
        populateDropdowns(globalData);
        renderLayer1(globalData);
        document.getElementById('dot').classList.replace('bg-yellow-500', 'bg-green-500');
        document.getElementById('statusText').innerText = "System Online";
      } catch (error) {
        document.getElementById('statusText').innerText = "Offline";
        document.getElementById('dot').classList.replace('bg-yellow-500', 'bg-red-500');
      }
    }

    function populateMasterDatalist() {
      const dl = document.getElementById('masterProducts');
      dl.innerHTML = masterList.map(item => `<option value="${item.product}" data-code="${item.code}">`).join('');
    }

    function populateDropdowns(data) {
      const brandSelect = document.getElementById('filterBrand');
      const brands = [...new Set(data.map(item => item.headerInfo.Brand))].filter(Boolean).sort();
      brandSelect.innerHTML = '<option value="">Semua Brand</option>';
      brands.forEach(brand => {
        const opt = document.createElement('option');
        opt.value = brand; opt.innerText = brand;
        brandSelect.appendChild(opt);
      });
    }
    function toggleEditMode(forceOff = false) {
      if (forceOff) isEditMode = false;
      else isEditMode = !isEditMode;

      const btn = document.getElementById('btnEditMode');
      const btnSave = document.getElementById('btnSave');
      const btnAdd = document.getElementById('btnAddItem');
      const bulkPanel = document.getElementById('bulkActionPanel');
      const btnHeader = document.getElementById('copyHeader');
      const btnBulk = document.getElementById('copyBulkCodeQty');
      const btnSend = document.getElementById('btnSendNotif');

      if (isEditMode) {
        btn.innerText = "Exit Edit";
        btn.classList.replace('bg-slate-100', 'bg-red-100');
        btn.classList.replace('text-slate-600', 'text-red-600');
        btnSave.classList.remove('hidden');
        bulkPanel.classList.remove('hidden');
        btnAdd.classList.remove('hidden');
        if (btnHeader) btnHeader.classList.add('hidden');
    	if (btnBulk) btnBulk.classList.add('hidden');
    	if (btnSend) btnSend.classList.add('hidden');
      } else {
        if (selectedIndex !== null) {
          currentDisplayedData[selectedIndex].details = currentDisplayedData[selectedIndex].details.filter(d => !d.isNewRow);
        }
        btn.innerText = "Edit Mode";
        btn.classList.replace('bg-red-100', 'bg-slate-100');
        btn.classList.replace('text-red-600', 'text-slate-600');
        btnSave.classList.add('hidden');
        bulkPanel.classList.add('hidden');
        btnAdd.classList.add('hidden');
        if (btnHeader) btnHeader.classList.remove('hidden');
    	if (btnBulk) btnBulk.classList.remove('hidden');
    	if (btnSend) btnSend.classList.remove('hidden');
      }
      openDetail(selectedIndex);
    }
    function openDetail(index) {
      selectedIndex = index;
      const item = currentDisplayedData[index];
      const h = item.headerInfo;
      
      const deleteHeader = document.querySelector('#modalDetail thead th:last-child');
      if (isEditMode) {
        deleteHeader.classList.remove('hidden');
      } else {
        deleteHeader.classList.add('hidden');
      }
      document.getElementById('modalID').innerText = h.ID;
      document.getElementById('pic').innerText = h.Nama;
      document.getElementById('modalTitle').innerText = h.Kegiatan;
      document.getElementById('detBrand').innerText = h.Brand;
      document.getElementById('detBudget').innerText = h.Kode_Budget;
      document.getElementById('detDate').innerText = h.Tanggal;
      document.getElementById('detBackground').innerText = h.Background || '-';
      document.getElementById('detObjective').innerText = h.Objective || '-';
      document.getElementById('detMekanisme').innerText = h.Mekanisme || '-';
      document.getElementById('detKeterangan').innerText = h.Keterangan || '-';
      let total = 0;
      const tbody = document.getElementById('modalTableBody');
      
      tbody.innerHTML = item.details.map((d, i) => {
        if (!d.OriginalKode) d.OriginalKode = d.Kode;
        total += (Number(d.Total) || 0);
        if (isEditMode) {
          return `
            <tr class="bg-indigo-50/20">
              <td class="p-2"><input type="text" value="${d.Kode}" class="w-full bg-transparent border-b border-slate-300 p-1 text-xs font-mono" id="row-code-${i}" readonly></td>
              <td class="p-2 relative" style="overflow: visible !important;">
                <div class="relative"> <input type="text" value="${d.Produk || ''}" 
		      class="w-full bg-white border border-slate-200 rounded p-2 font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none product-input" 
		      oninput="showSuggestions(this, ${i})" 
		      onfocus="showSuggestions(this, ${i})"
		      placeholder="Cari produk..."
		      autocomplete="off">
		    <div id="suggest-${i}" class="suggestion-box hidden"></div>
		  </div>
              </td>
              <td class="p-2 text-center">
                <input type="number" value="${d.Jumlah}" class="w-16 border border-slate-200 rounded p-1 text-center" oninput="validateQty(this, ${i})" data-stock-available="${d.Stok_Odoo || 9999}">
              </td>
              <td class="p-2 text-right font-bold text-indigo-600" id="row-total-${i}">${formatIDR(d.Total)}</td>
              <td class="p-2"><input type="text" value="${d.NO_DO || ''}" class="w-full border border-slate-200 rounded p-1 text-center font-bold row-nodo" id="row-nodo-${i}" oninput="updateMemory(${i}, 'NO_DO', this.value)"></td>
              <td class="p-2">
                <select class="w-full border border-slate-200 rounded p-1 font-bold row-status" onchange="handleStatusChange(this, ${i})">
                  <option value="Pending" ${d.Status==='Pending'?'selected':''}>Pending</option>
                  <option value="Pengajuan" ${d.Status==='Pengajuan'?'selected':''}>Pengajuan</option>
                  <option value="Done" ${d.Status==='Done'?'selected':''}>Done</option>
                  <option value="Kendala" ${d.Status==='Kendala'?'selected':''}>Kendala</option>
                </select>
              </td>

<td class="p-2 text-center">
        <button onclick="removeRow(${i})" class="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
            </tr>`;
        } else {
          return `
            <tr class="border-b border-slate-50">
              <td class="p-4 text-xs font-mono text-slate-400">${d.Kode}</td>
              <td class="p-4 font-bold text-slate-700">${d.Produk}</td>
              <td class="p-4 text-center">${d.Jumlah}</td>
              <td class="p-4 text-right font-bold text-indigo-600">${formatIDR(d.Total)}</td>
              <td class="p-4 text-center font-medium text-slate-500">${d.NO_DO || '-'}</td>
              <td class="p-4 text-center">${getStatusBadge(d.Status)}</td>
              <td class="p-4 ${!isEditMode ? 'hidden' : ''}"></td>
            </tr>`;
        }
      }).join('');
      document.getElementById('detGrandTotal').innerText = formatIDR(total);
      document.getElementById('modalDetail').classList.remove('hidden');
      document.body.classList.add('modal-active');
    }
    function closeModal() {
      if (selectedIndex !== null) {
        currentDisplayedData[selectedIndex].details = currentDisplayedData[selectedIndex].details.filter(d => !d.isNewRow);
      }
      isEditMode = false;
      const btn = document.getElementById('btnEditMode');
      btn.innerText = "Edit Mode";
      btn.className = "px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all";
      document.getElementById('btnSave').classList.add('hidden');
      document.getElementById('btnAddItem').classList.add('hidden');
      document.getElementById('bulkActionPanel').classList.add('hidden');
      
      document.getElementById('modalDetail').classList.add('hidden');
      document.body.classList.remove('modal-active');
    }
    function updateMemory(i, key, val) {
      currentDisplayedData[selectedIndex].details[i][key] = val;
    }

function showSuggestions(input, rowIndex) {
  document.querySelectorAll('.suggestion-box').forEach(box => box.classList.add('hidden'));
  const val = input.value.toLowerCase();
  const box = document.getElementById(`suggest-${rowIndex}`);
  if (val.length < 1) { 
    box.classList.add('hidden'); 
    activeSuggestRow = null; // Reset tracking
    return; 
  }
  const matches = masterList.filter(m => 
    m.product.toLowerCase().includes(val) || 
    m.code.toLowerCase().includes(val)
  ).slice(0, 10);
  if (matches.length > 0) {
    activeSuggestRow = rowIndex;
    box.innerHTML = matches.map(m => `
      <div onclick="selectProduct('${m.product.replace(/'/g, "\\'")}', '${m.code}', ${m.price}, ${m.available}, ${rowIndex})" 
           class="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
        <div class="text-[10px] font-black text-indigo-500">${m.code}</div>
        <div class="text-xs font-bold text-slate-700">${m.product}</div>
        <div class="text-[10px] text-slate-400">Stok: ${m.available} | ${formatIDR(m.price)}</div>
      </div>`).join('');
    box.classList.remove('hidden');
    if (rowIndex >= currentDisplayedData[selectedIndex].details.length - 1) {
       const modalBody = document.getElementById('modalBody');
       modalBody.scrollBy({ top: 100, behavior: 'smooth' });
    }
  } else { 
    box.classList.add('hidden');
    activeSuggestRow = null;
  }
}
    function selectProduct(name, code, price, stock, rowIndex) {
      const d = currentDisplayedData[selectedIndex].details[rowIndex];
      d.Produk = name; d.Kode = code; d.Harga = price; d.Stok_Odoo = stock;
      const row = document.getElementById(`modalTableBody`).children[rowIndex];
      const qtyInput = row.querySelector('input[type="number"]');
      qtyInput.setAttribute('data-stock-available', stock);
      row.querySelector('input[oninput^="showSuggestions"]').value = name;
      document.getElementById(`row-code-${rowIndex}`).value = code;
      recalcRowTotal(rowIndex);
      document.getElementById(`suggest-${rowIndex}`).classList.add('hidden');
    }
    function validateQty(input, rowIndex) {
      const available = Number(input.getAttribute('data-stock-available'));
      if (Number(input.value) > available) {
        showToast(`Stok cuma ada ${available}!`);
        input.value = available;
      }
      currentDisplayedData[selectedIndex].details[rowIndex].Jumlah = input.value;
      recalcRowTotal(rowIndex);
    }
    function recalcRowTotal(rowIndex) {
      const d = currentDisplayedData[selectedIndex].details[rowIndex];
      d.Total = Number(d.Jumlah) * Number(d.Harga);
      document.getElementById(`row-total-${rowIndex}`).innerText = formatIDR(d.Total);
      const grandTotal = currentDisplayedData[selectedIndex].details.reduce((acc, curr) => acc + (Number(curr.Total) || 0), 0);
      document.getElementById('detGrandTotal').innerText = formatIDR(grandTotal);
    }
    function handleStatusChange(select, rowIndex) {
      currentDisplayedData[selectedIndex].details[rowIndex].Status = select.value;
    }
    function applyBulkUpdate() {
      const status = document.getElementById('bulkStatus').value;
      const nodo = document.getElementById('bulkNoDo').value;
      if (!status && !nodo) return;
      document.querySelectorAll('.row-status').forEach((select, i) => {
        if (status) { select.value = status; currentDisplayedData[selectedIndex].details[i].Status = status; }
      });
      document.querySelectorAll('.row-nodo').forEach((input, i) => {
        if (nodo) { input.value = nodo; currentDisplayedData[selectedIndex].details[i].NO_DO = nodo; }
      });
      showToast("Update Bulk Berhasil!");
    }

    async function saveChanges() {
      const btn = document.getElementById('btnSave');
      btn.innerText = "Saving..."; btn.disabled = true;
      currentDisplayedData[selectedIndex].details.forEach(d => { if(d.isNewRow) delete d.isNewRow; });
      const payload = { 
        id: currentDisplayedData[selectedIndex].headerInfo.ID, 
        items: currentDisplayedData[selectedIndex].details 
      };
      try {
        await fetch(webAppUrl, { method: 'POST', body: JSON.stringify(payload) });
        showToast("Data Berhasil Diupdate!");
        toggleEditMode(true);
        fetchData(); 
      } catch (err) { 
        console.error(err); showToast("Error saving data!");
      } finally { 
        btn.innerText = "Save Changes"; btn.disabled = false; 
      }
    }
    function addNewItemRow() {
      const newItem = {
        Kode: "NEW-ITEM", Produk: "", Jumlah: 1, Harga: 0, Total: 0,
        Status: "Pending", NO_DO: "", Stok_Odoo: 0, OriginalKode: "NEW-ITEM",
        isNewRow: true
      };
      currentDisplayedData[selectedIndex].details.push(newItem);
      openDetail(selectedIndex);
      setTimeout(() => {
        const mb = document.getElementById('modalBody');
        mb.scrollTop = mb.scrollHeight;
      }, 50);
    }
function removeRow(index) {
  if (confirm("Hapus Data?")) {
    currentDisplayedData[selectedIndex].details.splice(index, 1);
    openDetail(selectedIndex);
    showToast("Data berhasil dihapus!");
  }
}
    function applyFilters() {
    const term = document.getElementById('omniSearch').value.toLowerCase();const brand = document.getElementById('filterBrand').value;const status = document.getElementById('filterStatus').value;
      currentDisplayedData = globalData.filter(item => {const h = item.headerInfo;const matchSearch = h.Nama.toLowerCase().includes(term) || h.Kegiatan.toLowerCase().includes(term) || h.ID.toString().includes(term);const matchBrand = brand === "" || h.Brand === brand;const matchStatus = status === "" || item.details.some(d => d.Status === status);return matchSearch && matchBrand && matchStatus;});renderLayer1(currentDisplayedData);
    }
    
    function resetFilters() {
      document.getElementById('omniSearch').value = ""; document.getElementById('filterBrand').value = ""; document.getElementById('filterStatus').value = "";
      currentDisplayedData = globalData; renderLayer1(globalData);
    }
    function getStatusBadge(status) {
      const s = status ? status.toLowerCase() : '';
      let color = s==='pending' ? "bg-slate-100 text-slate-600" : s==='pengajuan' ? "bg-blue-50 text-blue-700" : s==='done' ? "bg-green-50 text-green-700" : s==='kendala' ? "bg-red-50 text-red-700 animate-pulse" : "bg-gray-50 text-gray-400";
      return `<span class="px-2 py-1 text-[10px] font-black rounded-full ring-1 ring-inset uppercase ${color}">${status || 'Unknown'}</span>`;
    }
    function formatIDR(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n); }
    function renderLayer1(data) {
      const tbody = document.getElementById('tableBody');
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="p-10 text-center text-slate-400">Data tidak ditemukan</td></tr>'; return; }
      tbody.innerHTML = data.map((item, index) => `
        <tr class="hover:bg-indigo-50/40 transition-colors cursor-pointer" onclick="openDetail(${index})">
          <td class="px-6 py-4">
            <div class="text-xs font-black text-indigo-400">#${item.headerInfo.ID}</div>
            <div class="text-sm font-bold text-slate-700">${item.headerInfo.Nama}</div>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm font-semibold text-slate-600">${item.headerInfo.Kegiatan}</div>
            <div class="text-[10px] text-slate-400 uppercase font-bold">${item.headerInfo.Brand}</div>
          </td>
          <td class="px-6 py-4 text-center text-xs font-mono font-bold text-slate-500">${item.headerInfo.Tanggal}</td>
          <td class="px-6 py-4 text-center text-sm font-medium text-slate-400 truncate max-w-[150px]" title="${[...new Set(item.details.map(d => d.NO_DO))].join(', ')}">
	    ${[...new Set(item.details.map(d => d.NO_DO))].filter(no => no).join(', ') || '-'}
	  </td>
          <td class="px-6 py-4 text-center">
            <div class="flex flex-wrap justify-center gap-1">${[...new Set(item.details.map(d => d.Status))].map(s => getStatusBadge(s)).join('')}</div>
          </td>
          <td class="px-6 py-4 text-right"><button class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm">Detail</button></td>
        </tr>`).join('');
    }
function copyHeaderData() {
  const item = currentDisplayedData[selectedIndex];
  const h = item.headerInfo;
  const clean = (val) => {
    if (!val) return '-';
    return val.toString().replace(/[\r\n]+/g, ", ").trim();
  };
  let infoKolomB = "-";
  if (brandMaster && brandMaster.length > 0) {
    const match = brandMaster.find(b => b.name === h.Brand);
    if (match) {
      infoKolomB = clean(match.info);
    }
  }
  const textToCopy = `${clean(h.Background)}\n${clean(h.Objective)}\n${infoKolomB}\n${clean(h.Kode_Budget)}\n${clean(h.Mekanisme)}\n${clean(h.Tanggal)}\n\n${clean(h.Kegiatan)}`;
  navigator.clipboard.writeText(textToCopy).then(() => { 
    showToast("Info Berhasil Di-copy!"); 
  });
}
    function copyColumnData(key) {
      const details = currentDisplayedData[selectedIndex].details;
      const textToCopy = details.map(d => d[key]).join('\n');
      navigator.clipboard.writeText(textToCopy).then(() => { showToast(`Semua ${key} Di-copy!`); });
    }
function copyBulkCodeQty() {
  const item = currentDisplayedData[selectedIndex];
  if (!item || !item.details) {
    showToast("Data tidak ditemukan!");
    return;
  }
  const textToCopy = item.details.map((d, index) => {
    const kode = String(d.Kode || '-').trim();
    const qty = String(d.Jumlah || '0').trim();
    const rumusVlookup = `=IFERROR(VLOOKUP(TRIM($B${index + 17})&"", 'Product Code'!$B:F, 5, FALSE), "-")`; 
    return `${kode}\t${rumusVlookup}\t\t${qty}`; 
  }).join('\n');
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      showToast("Format A-B-D Copied!");
    })
    .catch(err => {
      console.error("Gagal Copy:", err);
      showToast("Gagal copy data!");
    });
}

function sendIncompleteRequest() {
  const item = currentDisplayedData[selectedIndex];
  if (!item) return;

  const h = item.headerInfo;
  const details = item.details;
  const uniqueDOs = [...new Set(details.map(d => String(d.NO_DO || "").trim()))]
    .filter(val => val && val.toUpperCase() !== "BARANG KOSONG");

  const normalItems = details.filter(d => {
    const val = String(d.NO_DO || "").toUpperCase();
    return val !== "BARANG KOSONG" && val !== "";
  });
  
  const emptyItems = details.filter(d => {
    const val = String(d.NO_DO || "").toUpperCase();
    return val === "BARANG KOSONG";
  });

  let message = `*DETAIL PENGIRIMAN BARANG*\n`;
  message += `----------------------------------\n`;
  message += `*ID:* #${h.ID}\n`;
  message += `*Kegiatan:* ${h.Kegiatan}\n`;
  message += `*PIC:* ${h.Nama}\n`;
  message += `*No. DO:* ${uniqueDOs.join(", ") || "-"}\n\n`;

  if (normalItems.length > 0) {
    message += `✅ *ITEM TERPENUHI:* \n`;
    normalItems.forEach((d) => {
      message += `- ${d.Produk} | *${d.Jumlah}* pcs | [DO: ${d.NO_DO}]\n`;
    });
    message += `\n`;
  }
  if (emptyItems.length > 0) {
    message += `❌ *ITEM TIDAK TERPENUHI (KOSONG):* \n`;
    emptyItems.forEach((d) => {
      message += `- ${d.Produk} | *${d.Jumlah}* pcs |\n`;
    });
    message += `\n`;
  }

  message += `----------------------------------\n`;
  message += `_Mohon dicek kembali rincian di atas._`;

  navigator.clipboard.writeText(message).then(() => {
    showToast("Data Berhasil Disalin! (Siap Paste)");
  }).catch(err => {
    console.error("Gagal Copy:", err);
    showToast("Gagal menyalin data!");
  });
}

    function showToast(message) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = "toast-enter bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/10 pointer-events-auto min-w-[200px]";
      toast.innerHTML = `
        <div class="bg-green-500 rounded-full p-1">
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <span class="text-xs font-bold tracking-wide">${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.classList.replace('toast-enter', 'toast-active'), 10);
      setTimeout(() => {
        toast.classList.replace('toast-active', 'toast-exit');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.relative')) {
        document.querySelectorAll('[id^="suggest-"]').forEach(el => el.classList.add('hidden'));
      }
    });

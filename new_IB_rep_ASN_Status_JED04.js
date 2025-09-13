javascript:(async function () {
  const pendingAsnUrl = "https://inbound-api-inbound.noon.team/reports/pending_asn?warehouse_code=JED04&format=html";
  const warehouseCode = "JED04";

  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.style.position = 'fixed';
  progressBar.style.top = '0';
  progressBar.style.left = '0';
  progressBar.style.width = '100%';
  progressBar.style.zIndex = '1000';
  document.body.appendChild(progressBar);

  try {
    const pendingAsnResponse = await fetch(pendingAsnUrl);
    if (!pendingAsnResponse.ok) throw new Error(`Error fetching pending ASN: ${pendingAsnResponse.status}`);

    const pendingAsnHtml = await pendingAsnResponse.text();
    const parser = new DOMParser();
    const pendingAsnDoc = parser.parseFromString(pendingAsnHtml, 'text/html');
    const asnTable = pendingAsnDoc.querySelector('table');
    if (!asnTable) throw new Error("ASN Table not found in HTML.");

    const asnRows = asnTable.querySelectorAll('tr');
    const headerCells = Array.from(asnRows[0].querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
    const asnIndex = headerCells.indexOf("asn nr");
    const statusIndex = headerCells.indexOf("inbound status");
    if (asnIndex === -1 || statusIndex === -1) throw new Error("Required columns not found");

    const asnNumbers = [];
    for (let i = 1; i < asnRows.length; i++) {
      const cells = asnRows[i].querySelectorAll('td');
      if (cells.length > Math.max(asnIndex, statusIndex)) {
        const asnNumber = cells[asnIndex].textContent.trim();
        const status = cells[statusIndex].textContent.trim().toLowerCase();
        if (status !== "gatein_completed") asnNumbers.push(asnNumber);
      }
    }

    const urls = asnNumbers.map(asn => `https://inbound-api-inbound.noon.team/reports/asn_boxes?asn_nr=${asn}&format=html`);
    const outputDiv = document.createElement('div');
    document.body.appendChild(outputDiv);
    const mainHeader = document.createElement('h2');
    mainHeader.textContent = "Combined ASN Data";
    outputDiv.appendChild(mainHeader);

    let csvContent = "";
    let allHeaders = [];
    let headersExtracted = false;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const response = await fetch(url);
      if (!response.ok) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `<p style="color:red">Error fetching ${url}: ${response.status}</p>`;
        outputDiv.appendChild(errorDiv);
        continue;
      }

      const html = await response.text();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector("table");

      if (table) {
        const rows = table.querySelectorAll('tr');
        if (!headersExtracted) {
          allHeaders = Array.from(rows[0].querySelectorAll("th")).map(th => th.textContent.trim());
          csvContent += allHeaders.join('\t') + '\n';
          headersExtracted = true;
        }

        for (let j = 1; j < rows.length; j++) {
          const cells = Array.from(rows[j].querySelectorAll('td'));
          const rowData = cells.map(cell => cell.textContent.trim());
          csvContent += rowData.join('\t') + '\n';
        }
      }

      progressBar.value = ((i + 1) / urls.length) * 100;
    }

    const completionMessage = document.createElement('div');
    completionMessage.textContent = "All ASN data has been fetched and displayed.";
    completionMessage.style.position = 'fixed';
    completionMessage.style.top = '0';
    completionMessage.style.left = '0';
    completionMessage.style.width = '100%';
    completionMessage.style.backgroundColor = '#d4edda';
    completionMessage.style.color = '#155724';
    completionMessage.style.padding = '10px';
    completionMessage.style.zIndex = '1001';
    document.body.replaceChild(completionMessage, progressBar);

    // ✅ Download ASN TSV file
    const tsvBlob = new Blob([csvContent], { type: "text/tab-separated-values" });
    const tsvUrl = URL.createObjectURL(tsvBlob);
    const tsvLink = document.createElement("a");
    tsvLink.href = tsvUrl;
    tsvLink.download = `${warehouseCode}_asn_Status.tsv`;
    document.body.appendChild(tsvLink);
    tsvLink.click();
    document.body.removeChild(tsvLink);

    // ✅ Attempt CSV download from external URL with fallback
    try {
      const externalCsvUrl = `https://wms-api-repl.noon.team/reports/asn_putaway_item_pendency_v2?warehouse_code=${warehouseCode}&format=html&export=csv`;

      const response = await fetch(externalCsvUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      const contentType = response.headers.get("content-type");

      if (response.ok && contentType && contentType.includes("text/csv")) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = `asn_putaway_item_pendency_${warehouseCode}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        throw new Error("No valid CSV returned");
      }

    } catch (csvError) {
  console.warn("CSV download failed or no data, generating empty fallback file...");

  const fallbackHeaders = [
    "box_barcode", "asn_nr", "platform_unique_item_src", "warehouse", "item_status", "user_email", "user_name",
    "scanned_barcode", "exref_type", "active_location", "put_location", "putaway_qty", "reported_qty", "packed_qty",
    "job_started_at", "job_closed_at", "wms_barcode", "box_type_qc", "reject_reason_code", "sort_id", "id_partner",
    "sealed_at", "sealed_by", "is_transfer_box", "pbarcode", "pbarcode_canonical", "put_location_list"
  ];

  // Determine correct index of warehouse column (case-insensitive)
  const warehouseIndex = fallbackHeaders.findIndex(h => h.trim().toLowerCase() === "warehouse");

  // Initialize row with empty strings
  const dummyRow = Array(fallbackHeaders.length).fill("");

  // Set warehouse value in correct column
  if (warehouseIndex !== -1) {
    dummyRow[warehouseIndex] = warehouseCode;
  }

  const emptyCsvContent = fallbackHeaders.join(",") + "\n" + dummyRow.join(",") + "\n";

  const fallbackBlob = new Blob([emptyCsvContent], { type: "text/csv" });
  const fallbackUrl = URL.createObjectURL(fallbackBlob);
  const fallbackLink = document.createElement("a");
  fallbackLink.href = fallbackUrl;
  fallbackLink.download = `asn_putaway_item_pendency_${warehouseCode}_EMPTY.csv`;
  document.body.appendChild(fallbackLink);
  fallbackLink.click();
  document.body.removeChild(fallbackLink);
}


  } catch (error) {
    console.error("An error occurred:", error.message);
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    document.body.appendChild(errorDiv);
    document.body.removeChild(progressBar);
  }
})();

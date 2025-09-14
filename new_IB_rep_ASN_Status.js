javascript:(async function () {
  const warehouseCode = "JED01";
  const pendingAsnUrl = `https://inbound-api-inbound.noon.team/reports/pending_asn?warehouse_code=${warehouseCode}&format=html`;

  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  Object.assign(progressBar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    zIndex: '1000'
  });
  document.body.appendChild(progressBar);

  try {
    const pendingAsnResponse = await fetch(pendingAsnUrl);
    if (!pendingAsnResponse.ok) throw new Error(`Error fetching pending ASN: ${pendingAsnResponse.status}`);

    const pendingAsnHtml = await pendingAsnResponse.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(pendingAsnHtml, 'text/html');
    const asnTable = doc.querySelector('table');
    if (!asnTable) throw new Error("ASN Table not found");

    const rows = asnTable.querySelectorAll('tr');
    const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
    const asnIndex = headers.indexOf("asn nr");
    const statusIndex = headers.indexOf("inbound status");
    if (asnIndex === -1 || statusIndex === -1) throw new Error("Required columns missing");

    const asnNumbers = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      const asn = cells[asnIndex]?.textContent.trim();
      const status = cells[statusIndex]?.textContent.trim().toLowerCase();
      if (asn && status !== "gatein_completed") asnNumbers.push(asn);
    }

    const urls = asnNumbers.map(asn => `https://inbound-api-inbound.noon.team/reports/asn_boxes?asn_nr=${asn}&format=html`);

    let csvContent = "";
    let headersExtracted = false;
    const outputDiv = document.createElement('div');
    document.body.appendChild(outputDiv);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      // Add delay to avoid 429
      await new Promise(r => setTimeout(r, 300));

      const response = await fetch(url);
      if (!response.ok) {
        const errMsg = `Error fetching ${url}: ${response.status}`;
        console.warn(errMsg);
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `<p style="color:red">${errMsg}</p>`;
        outputDiv.appendChild(errorDiv);
        continue;
      }

      const html = await response.text();
      const page = parser.parseFromString(html, 'text/html');
      const table = page.querySelector('table');
      if (!table) continue;

      const tableRows = table.querySelectorAll('tr');
      if (!headersExtracted) {
        const tableHeaders = Array.from(tableRows[0].querySelectorAll("th")).map(th => th.textContent.trim());
        csvContent += tableHeaders.join('\t') + '\n';
        headersExtracted = true;
      }

      for (let j = 1; j < tableRows.length; j++) {
        const cells = Array.from(tableRows[j].querySelectorAll('td')).map(td => td.textContent.trim());
        csvContent += cells.join('\t') + '\n';
      }

      progressBar.value = ((i + 1) / urls.length) * 100;
    }

    // Replace progress bar with completion message
    const completeMsg = document.createElement('div');
    completeMsg.textContent = "All ASN data has been fetched and downloaded.";
    Object.assign(completeMsg.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '10px',
      zIndex: '1001'
    });
    document.body.replaceChild(completeMsg, progressBar);

    // Download the TSV file
    const tsvBlob = new Blob([csvContent], { type: "text/tab-separated-values" });
    const tsvUrl = URL.createObjectURL(tsvBlob);
    const tsvLink = document.createElement("a");
    tsvLink.href = tsvUrl;
    tsvLink.download = `${warehouseCode}_asn_Status.tsv`;
    document.body.appendChild(tsvLink);
    tsvLink.click();
    document.body.removeChild(tsvLink);

  } catch (error) {
    console.error("Script Error:", error);
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    document.body.appendChild(errorDiv);
    document.body.removeChild(progressBar);
  }
})();

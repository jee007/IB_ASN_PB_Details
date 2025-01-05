javascript:(async () => {
  const pUrl = "https://inbound-api-inbound.sc.noon.team/reports/pending_asn?warehouse_code=W00053710A&format=html";
  const pb = document.createElement('progress');
  pb.max = 100;
  pb.value = 0;
  pb.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:1000;';
  document.body.appendChild(pb);

  try {
    const pRes = await fetch(pUrl);
    if (!pRes.ok) {
      console.error("Error fetching pending ASN:", pRes.status, pRes.statusText);
      document.body.removeChild(pb);
      return;
    }

    const pHtml = await pRes.text();
    const parser = new DOMParser();
    const pDoc = parser.parseFromString(pHtml, 'text/html');
    const aTbl = pDoc.querySelector('table');

    if (!aTbl) {
      console.error("No table found in pending ASN response.");
      document.body.removeChild(pb);
      return;
    }

    const aNrs = Array.from(aTbl.querySelectorAll('tr:nth-child(n+2) td:first-child')).map(c => c.textContent.trim());
    const outDiv = document.createElement('div');
    document.body.appendChild(outDiv);

    const mainH = document.createElement('h2');
    mainH.textContent = "Box Data";
    outDiv.appendChild(mainH);

    let allAwbNrs = [];
    for (let asnIdx = 0; asnIdx < aNrs.length; asnIdx++) {
      const asnNr = aNrs[asnIdx];
      const abUrl = `https://inbound-api-inbound.sc.noon.team/reports/asn_boxes?asn_nr=${asnNr}&format=html`;
      const abRes = await fetch(abUrl);

      if (!abRes.ok) {
        const errDiv = document.createElement('div');
        errDiv.innerHTML = `<p style="color:red">Error fetching ASN Boxes URL: ${abUrl} (${abRes.status} ${abRes.statusText})</p>`;
        outDiv.appendChild(errDiv);
        continue;
      }

      const abHtml = await abRes.text();
      const abDoc = parser.parseFromString(abHtml, 'text/html');
      const bTbl = abDoc.querySelector('table');

      if (!bTbl) {
        const errDiv = document.createElement('div');
        errDiv.innerHTML = `<p style="color:red">No table found in ASN Boxes URL: ${abUrl}</p>`;
        outDiv.appendChild(errDiv);
        continue;
      }

      allAwbNrs.push(...Array.from(bTbl.querySelectorAll('tr:nth-child(n+2) td:nth-child(2)')).map(c => c.textContent.trim()));
      pb.value = ((asnIdx + 1) / aNrs.length) * 50;
    }

    const urls = allAwbNrs.map(awb => `https://inbound-api-inbound.sc.noon.team/reports/box_status?awb_nr=${awb}&format=html`);
    let csvC = "";
    let hExt = false;
    let allHdrs = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const res = await fetch(url);

      if (!res.ok) {
        const errDiv = document.createElement('div');
        errDiv.innerHTML = `<p style="color:red">Error fetching URL: ${url} (${res.status} ${res.statusText})</p>`;
        outDiv.appendChild(errDiv);
        continue;
      }

      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');
      const tbl = doc.querySelector('table');

      if (tbl) {
        const rows = tbl.querySelectorAll('tr');
        if (!hExt) {
          allHdrs = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent.trim());
          csvC += allHdrs.join('\t') + '\n';
          hExt = true;
        }

        for (let j = 1; j < rows.length; j++) {
          csvC += Array.from(rows[j].querySelectorAll('td')).map(c => c.textContent.trim()).join('\t') + '\n';
        }
      }

      pb.value = 50 + ((i + 1) / urls.length) * 50;
    }

    const compMsg = document.createElement('div');
    compMsg.textContent = "Fetched all data.";
    compMsg.style.cssText = 'position:fixed;top:0;left:0;width:100%;background-color:#f0f0f0;padding:10px;text-align:center;z-index:1001;';
    document.body.replaceChild(compMsg, pb);

    const csvFile = new Blob([csvC], { type: "text/tab-separated-values" });
    const dLink = document.createElement('a');
    dLink.href = URL.createObjectURL(csvFile);
    dLink.download = "box_status_data.tsv";
    dLink.style.display = "none";
    document.body.appendChild(dLink);
    dLink.click();
    document.body.removeChild(dLink);

  } catch (e) {
    const errDiv = document.createElement('div');
    errDiv.innerHTML = `<p style="color:red">An error occurred: ${e.message}</p>`;
    document.body.appendChild(errDiv);
    document.body.removeChild(pb);
  }
})();

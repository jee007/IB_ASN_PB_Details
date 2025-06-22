javascript: (async function() {
  const pendingAsnUrl = "https://inbound-api-inbound.noon.team/reports/pending_asn?warehouse_code=W00000004A&format=json";

  try {
    const response = await fetch(pendingAsnUrl);
    if (!response.ok) {
      console.error("Error fetching data:", response.status, response.statusText);
      return;
    }

    const jsonData = await response.json();

    if (!jsonData || !jsonData.rows || jsonData.rows.length === 0) {
      console.error("No data or invalid data format found in JSON response.");
      return;
    }

        const rows = jsonData.rows;
    if (rows.length === 0) {
       return;
    }

      const headers = Object.keys(rows[0]);
    let tsvContent = headers.join('\t') + '\n';

        rows.forEach(row => {
            const rowValues = headers.map(header => row[header] != null ? String(row[header]) : '');
           tsvContent += rowValues.join('\t') + '\n';
      });


    const blob = new Blob([tsvContent], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "JED01_wh_asn.tsv";
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

  } catch (error) {
    console.error("An error occurred:", error);
  }
})();

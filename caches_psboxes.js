javascript: (async () => {
    const cacheKey = "psboxes_cache";
    const cacheExpiry = 3600000; // 1 hour
    const pUrl = "https://inbound-api-inbound.sc.noon.team/reports/pending_asn?warehouse_code=W00053710A&format=json";

    async function fetchWithBackoff(url, maxRetries = 5, retryDelay = 2000) {
      for (let i = 0; i <= maxRetries; i++) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            return await response.json();
          } else if (response.status === 429) {
            console.log('Rate limit hit, retrying in ' + retryDelay / 1000 + ' seconds');
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2;
          } else {
            throw new Error(`Request failed with status: ${response.status}`);
          }
        } catch (e) {
          console.log('Error during fetch:', e);
          return null;
        }
      }
      console.log("Max retries reached, could not fetch data.");
      return null;
    }


    function downloadTSV(data, filename) {
      const blob = new Blob([data], { type: "text/tab-separated-values" });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = filename;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    let cachedData = localStorage.getItem(cacheKey);
    let asnData;

    if (cachedData) {
        try {
            const parsedCache = JSON.parse(cachedData);
          if (parsedCache && parsedCache.expiry && Date.now() < parsedCache.expiry) {
              console.log("Data loaded from cache (psboxes)");
              asnData = parsedCache.data;
          } else {
             console.log("Cache expired, fetching fresh data (psboxes)");
              asnData = await fetchWithBackoff(pUrl);
            if (asnData) {
               const expiry = Date.now() + cacheExpiry;
               const cacheData = JSON.stringify({ expiry: expiry, data: asnData });
               localStorage.setItem(cacheKey, cacheData);
              }
          }
        } catch (e) {
           console.log("Error parsing cache for psboxes. Fetching new data: ", e);
             asnData = await fetchWithBackoff(pUrl);
             if (asnData) {
                const expiry = Date.now() + cacheExpiry;
                const cacheData = JSON.stringify({ expiry: expiry, data: asnData });
                localStorage.setItem(cacheKey, cacheData);
               }
          }
      } else {
          console.log("No cache found, fetching fresh data (psboxes)");
          asnData = await fetchWithBackoff(pUrl);
          if (asnData) {
             const expiry = Date.now() + cacheExpiry;
             const cacheData = JSON.stringify({ expiry: expiry, data: asnData });
            localStorage.setItem(cacheKey, cacheData);
           }
      }


    if (!asnData || !asnData.rows) {
      console.error("Invalid asn data received");
        return;
    }

    const aNrs = asnData.rows.map(row => row["ASN Number"]);
    let allAwbNrs = [];

    for (const asnNr of aNrs) {
         const abUrl = `https://inbound-api-inbound.sc.noon.team/reports/asn_boxes?asn_nr=${asnNr}&format=json`;
         const boxesData = await fetchWithBackoff(abUrl);

         if(boxesData && boxesData.rows) {
           allAwbNrs.push(...boxesData.rows.map(row => row["AWB Number"]));
         }

    }

     let csvC = "";
     let hExt = false;
     let allHdrs = [];


     for (let i = 0; i < allAwbNrs.length; i++) {
       const awb = allAwbNrs[i];
        const url = `https://inbound-api-inbound.sc.noon.team/reports/box_status?awb_nr=${awb}&format=json`;
         const boxStatus = await fetchWithBackoff(url);

       if (boxStatus && boxStatus.rows) {
           if (!hExt) {
              allHdrs = Object.keys(boxStatus.rows[0]);
              csvC += allHdrs.join("\t") + '\n';
              hExt = true;
           }
            boxStatus.rows.forEach(row => {
             csvC += allHdrs.map(header => row[header] != null ? String(row[header]) : '').join('\t') + '\n';
            });
       }
    }

     downloadTSV(csvC, "box_status_data.tsv");

  })();

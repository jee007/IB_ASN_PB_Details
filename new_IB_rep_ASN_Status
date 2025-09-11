javascript:(async function(){
  const pendingAsnUrl="https://inbound-api-inbound.noon.team/reports/pending_asn?warehouse_code=JED01&format=html";
  const progressBar=document.createElement('progress');
  progressBar.max=100;progressBar.value=0;
  progressBar.style.position='fixed';
  progressBar.style.top='0';progressBar.style.left='0';
  progressBar.style.width='100%';progressBar.style.zIndex='1000';
  document.body.appendChild(progressBar);

  try{
    const pendingAsnResponse=await fetch(pendingAsnUrl);
    if(!pendingAsnResponse.ok){
      console.error("Error fetching pending ASN data:",pendingAsnResponse.status,pendingAsnResponse.statusText);
      document.body.removeChild(progressBar);return;
    }

    const pendingAsnHtml=await pendingAsnResponse.text();
    const parser=new DOMParser();
    const pendingAsnDoc=parser.parseFromString(pendingAsnHtml,'text/html');
    const asnTable=pendingAsnDoc.querySelector('table');
    if(!asnTable){
      console.error("Could not find table in pending ASN HTML");
      document.body.removeChild(progressBar);return;
    }

    const asnRows=asnTable.querySelectorAll('tr');
    const headerCells=Array.from(asnRows[0].querySelectorAll('th')).map(th=>th.textContent.trim().toLowerCase());
    const asnIndex=headerCells.indexOf("asn nr");
    const statusIndex=headerCells.indexOf("inbound status");
    if(asnIndex===-1||statusIndex===-1){
      console.error("Required columns not found in table");
      document.body.removeChild(progressBar);return;
    }

    let asnNumbers=[];
    for(let i=1;i<asnRows.length;i++){
      const cells=asnRows[i].querySelectorAll('td');
      if(cells.length>Math.max(asnIndex,statusIndex)){
        const asnNumber=cells[asnIndex].textContent.trim();
        const status=cells[statusIndex].textContent.trim().toLowerCase();
        if(status!=="gatein_completed")asnNumbers.push(asnNumber);
      }
    }

    const urls=asnNumbers.map(asn=>`https://inbound-api-inbound.noon.team/reports/asn_boxes?asn_nr=${asn}&format=html`);
    const outputDiv=document.createElement('div');
    document.body.appendChild(outputDiv);
    const mainHeader=document.createElement('h2');
    mainHeader.textContent="Combined ASN Data";
    outputDiv.appendChild(mainHeader);
    let csvContent="";let allHeaders=[];let headersExtracted=false;
    const totalUrls=urls.length;

    for(let i=0;i<totalUrls;i++){
      const url=urls[i];
      const response=await fetch(url);
      if(!response.ok){
        const errorDiv=document.createElement('div');
        errorDiv.innerHTML=`<p style="color:red">Error fetching data from URL: ${url} ${response.status} ${response.statusText}</p>`;
        outputDiv.appendChild(errorDiv);continue;
      }

      const html=await response.text();
      const doc=parser.parseFromString(html,'text/html');
      const table=doc.querySelector("table");
      if(table){
        const rows=table.querySelectorAll('tr');
        if(!headersExtracted){
          allHeaders=Array.from(rows[0].querySelectorAll("th")).map(th=>th.textContent.trim());
          csvContent+=allHeaders.join('\t')+'\n';
          headersExtracted=true;
        }
        for(let j=1;j<rows.length;j++){
          const cells=Array.from(rows[j].querySelectorAll('td'));
          const rowData=cells.map(cell=>cell.textContent.trim());
          csvContent+=rowData.join('\t')+'\n';
        }
      }

      const tempDiv=document.createElement('div');
      tempDiv.innerHTML=`<hr>${html}<hr><br>`;
      while(tempDiv.firstChild)outputDiv.appendChild(tempDiv.firstChild);
      progressBar.value=((i+1)/totalUrls)*100;
    }

    const completionMessage=document.createElement('div');
    completionMessage.textContent="All ASN data has been fetched and displayed.";
    completionMessage.style.position='fixed';
    completionMessage.style.top='0';completionMessage.style.left='0';
    completionMessage.style.width='100%';
    completionMessage.style.backgroundColor='#f0f0f0';
    completionMessage.style.padding='10px';
    completionMessage.style.textAlign='center';
    completionMessage.style.zIndex='1001';
    document.body.replaceChild(completionMessage,progressBar);

    // Download the generated TSV file
    const csvFile=new Blob([csvContent],{type:"text/tab-separated-values"});
    const downloadLink=document.createElement("a");
    downloadLink.href=URL.createObjectURL(csvFile);
    downloadLink.download="JED01_asn_Status.tsv";
    downloadLink.style.display="none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Bypass CORS – directly trigger CSV download via <a> (no fetch)
    const warehouseCode="JED01";
    const externalCsvUrl=`https://wms-api-repl.noon.team/reports/asn_putaway_item_pendency_v2?warehouse_code=${warehouseCode}&format=html&export=csv`;
    const directDownload=document.createElement("a");
    directDownload.href=externalCsvUrl;
    directDownload.download=`asn_putaway_item_pendency_${warehouseCode}.csv`;
    directDownload.style.display="none";
    document.body.appendChild(directDownload);
    directDownload.click();
    document.body.removeChild(directDownload);

  }catch(error){
    const errorDiv=document.createElement('div');
    errorDiv.innerHTML=`<p style="color:red">An error occurred: ${error.message}</p>`;
    document.body.appendChild(errorDiv);
    document.body.removeChild(progressBar);
  }
})();

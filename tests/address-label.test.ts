import fs from "fs";

(async () => {
  let res = await fetch(
    "https://eth-labels-production.up.railway.app/accounts?chainId=1"
  );
  let records: any = await res.json();
  records = new Set(records);

  fs.writeFileSync("./labels.json", JSON.stringify(Array.from(records)));
  console.log(`
    ${records.size} records
`);
})();

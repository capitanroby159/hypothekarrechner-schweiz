/**
 * hypothek.js - Final Version (Diagnose Fokus)
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Rechner geladen.");

    // Buttons verknüpfen
    const calcBtn = document.getElementById('calculateBtn');
    if(calcBtn) calcBtn.addEventListener('click', startAnalysis);

    const leadBtn = document.getElementById('leadBtn');
    if(leadBtn) leadBtn.addEventListener('click', submitLead);

    // 1000er Trennzeichen
    const moneyInputs = document.querySelectorAll('.money');
    moneyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if(val) e.target.value = Number(val).toLocaleString('de-CH').replace(/,/g, "'");
        });
    });
});

// --- HILFSFUNKTIONEN ---

function getSafeValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

function parseMoney(id) {
  const rawVal = getSafeValue(id);
  if (!rawVal) return 0;
  const cleanStr = String(rawVal).replace(/[^0-9]/g, ''); 
  return parseInt(cleanStr, 10) || 0;
}

function getAge(id) {
  const dateString = getSafeValue(id);
  if (!dateString) return 0;
  const today = new Date();
  const birthDate = new Date(dateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function fmtCHF(num) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(num);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}


// --- HAUPTFUNKTION ---

function startAnalysis(e) {
  if(e) e.preventDefault();
  console.log("Analyse startet...");

  // 1. Validierung
  const price = parseMoney('propertyPrice');
  if (price < 10000) {
      alert("Bitte geben Sie einen Kaufpreis ein.");
      return;
  }

  // 2. Daten holen
  const inc1 = parseMoney('income_b1');
  const bonus1 = parseMoney('bonus_b1');
  const liab1 = parseMoney('liabilities_b1');
  const pens1 = parseMoney('pension_old_b1');
  const age1 = getAge('birthdate_b1');

  const inc2 = parseMoney('income_b2');
  const bonus2 = parseMoney('bonus_b2');
  const liab2 = parseMoney('liabilities_b2');
  const pens2 = parseMoney('pension_old_b2');
  const age2 = getAge('birthdate_b2');

  const renovation = parseMoney('renovationCost');
  const buildYearVal = getSafeValue('buildYear');

  const tax = parseMoney('tax_transfer');
  const notary = parseMoney('fee_notary');
  const registry = parseMoney('fee_registry');
  const noteFee = parseMoney('fee_mortgage');

  const eqCash = parseMoney('equityCash');
  const eq3a = parseMoney('equity3a');
  const eqPK = parseMoney('equityPK');

  // 3. Aggregation
  const totalIncome = inc1 + bonus1 + inc2 + bonus2;
  const totalLiabilitiesYear = liab1 + liab2;
  const totalEquity = eqCash + eq3a + eqPK;
  const totalPension = (pens1 + pens2) > 0 ? (pens1 + pens2) : (totalIncome * 0.6);
  const maxAge = Math.max(age1, age2);


  // --- PHASE 1: ANSCHAFFUNG ---
  const totalBuyingFees = tax + notary + registry + noteFee;
  const totalObjektInvest = price + renovation;
  const mortgage = Math.max(0, totalObjektInvest - totalEquity);
  const lendingRatio = (totalObjektInvest > 0) ? (mortgage / totalObjektInvest) * 100 : 0;
  const totalCashNeeded = totalEquity + totalBuyingFees;

  // OUTPUT PHASE 1
  setText('d_mortgage', fmtCHF(mortgage));
  setText('d_lending', `Belehnung: ${lendingRatio.toFixed(1)}%`);
  setText('d_buyingFees', fmtCHF(totalBuyingFees));
  setText('d_totalInvest', fmtCHF(totalObjektInvest));
  setText('d_cashNeeded', fmtCHF(totalCashNeeded));
  
  if(document.getElementById('d_equityTotal')) {
      setText('d_equityTotal', fmtCHF(totalEquity));
      setText('d_equitySplit', `Cash: ${fmtCHF(eqCash)} | PK/3a: ${fmtCHF(eq3a+eqPK)}`);
  }


  // --- PHASE 2: LAUFENDE KOSTEN ---
  const rateCalc = 0.05;
  const max1st = totalObjektInvest * 0.6666;
  const mortgage2nd = Math.max(0, mortgage - max1st);
  
  let yearsToRetire = 65 - maxAge;
  let amortDuration = 15;
  if (maxAge > 0) {
      if (yearsToRetire < 1) yearsToRetire = 1;
      amortDuration = Math.min(15, yearsToRetire);
  }

  // HEV Berechnung
  const currentYear = new Date().getFullYear();
  let buildingAge = 20; 
  if(buildYearVal) buildingAge = currentYear - parseInt(buildYearVal);
  let hevRate = 0.008; // Alt
  if (buildingAge <= 10) hevRate = 0.005; // Neu

  const interestYear = mortgage * rateCalc;
  const amortYear = mortgage2nd / amortDuration;
  
  // Bank & HEV
  const maintenanceBank = totalObjektInvest * 0.01;
  const maintenanceReal = totalObjektInvest * 0.003; 
  const maintenanceTotalHEV = totalObjektInvest * hevRate;
  const maintenanceSave = Math.max(0, maintenanceTotalHEV - maintenanceReal);

  const housingCostsBank = interestYear + amortYear + maintenanceBank;
  const totalBurdenBank = housingCostsBank + totalLiabilitiesYear;
  const affordPct = (totalIncome > 0) ? (totalBurdenBank / totalIncome) * 100 : 0;

  // OUTPUT PHASE 2
  setText('d_interestYear', fmtCHF(interestYear));
  setText('d_amortYear', fmtCHF(amortYear));
  setText('d_maintenanceSave', fmtCHF(maintenanceSave));
  setText('d_maintenanceReal', fmtCHF(maintenanceReal));

  const bar = document.getElementById('d_affordabilityBar');
  const barText = document.getElementById('d_affordabilityText');
  if(bar) {
      bar.style.width = Math.min(affordPct, 100) + "%";
      if(affordPct <= 34) {
          bar.style.background = "var(--good)";
          barText.textContent = `Tragbarkeit (Bank): ${affordPct.toFixed(1)}% (OK)`;
      } else if(affordPct <= 38) {
          bar.style.background = "var(--warning)";
          barText.textContent = `Tragbarkeit (Bank): ${affordPct.toFixed(1)}% (Erhöht)`;
      } else {
          bar.style.background = "var(--danger)";
          barText.textContent = `Tragbarkeit (Bank): ${affordPct.toFixed(1)}% (Kritisch)`;
      }
  }


  // --- PHASE 3: ZUKUNFT & LÜCKE ---
  
  const restDebt = Math.min(mortgage, max1st);
  
  // Berechnung Max. Hypothek Rente (34% Tragbarkeit, 1% NK)
  const maxAffordableCostPension = totalPension * 0.34; 
  const availableForInterest = maxAffordableCostPension - maintenanceBank - totalLiabilitiesYear;
  const maxMortgagePension = Math.max(0, availableForInterest / rateCalc);
  
  // Die Lücke (Totaler Fehlbetrag)
  const fundingGap = Math.max(0, restDebt - maxMortgagePension);
  
  // Tragbarkeit im Alter %
  const interestPension = restDebt * rateCalc;
  const burdenPension = interestPension + maintenanceBank + totalLiabilitiesYear;
  const affordPensionPct = (totalPension > 0) ? (burdenPension / totalPension) * 100 : 0;


  // OUTPUT PHASE 3
  setText('d_restDebt', fmtCHF(restDebt));
  setText('d_maxMortgagePension', fmtCHF(maxMortgagePension));
  
  // Hier zeigen wir nur das TOTALE Gap (Fehlendes Kapital)
  setText('d_gapTotal', fmtCHF(fundingGap));
  
  const gapBadge = document.getElementById('d_gapBadge');
  const boxGap = document.getElementById('box_gapTotal');

  if (fundingGap > 0) {
      // Rote Alarmstufe
      if(gapBadge) {
          gapBadge.textContent = "Unterdeckung!";
          gapBadge.className = "badge badge-red";
      }
      if(boxGap) {
          boxGap.style.borderColor = "var(--danger)";
          boxGap.style.backgroundColor = "#fff5f5"; // Leicht rötlicher Hintergrund
      }
  } else {
      // Alles Grün
      if(gapBadge) {
          gapBadge.textContent = "Finanzierung gesichert";
          gapBadge.className = "badge badge-green";
      }
      if(boxGap) {
          boxGap.style.borderColor = "var(--good)";
          boxGap.style.backgroundColor = "#f0fdf4"; // Leicht grüner Hintergrund
      }
  }

  setText('d_pensionAffordability', affordPensionPct.toFixed(1) + "%");
  const penBadge = document.getElementById('d_pensionStatus');
  if(penBadge) {
      if(affordPensionPct <= 34) {
          penBadge.textContent = "Grün";
          penBadge.className = "badge badge-green";
      } else {
          penBadge.textContent = "Kritisch";
          penBadge.className = "badge badge-red";
      }
  }


  // --- VIEW WECHSELN ---
  const inputDiv = document.getElementById('inputStage');
  const dashDiv = document.getElementById('dashboardStage');
  if(inputDiv && dashDiv) {
      inputDiv.style.display = 'none';
      dashDiv.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function submitLead(e) {
    if(e) e.preventDefault();
    alert("Vielen Dank! Ein Berater wird Ihre Daten prüfen.");
}

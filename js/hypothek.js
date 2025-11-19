// ==========================================
// 1. INITIALISIERUNG & EVENT LISTENER
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Rechner bereit.");

    // Buttons verknüpfen
    const calcBtn = document.getElementById('calculateBtn');
    if (calcBtn) calcBtn.addEventListener('click', startAnalysis);

    const leadBtn = document.getElementById('leadBtn');
    if (leadBtn) leadBtn.addEventListener('click', submitLead);

    // Automatische Formatierung für Zahlenfelder (1'000er Trennzeichen)
    const moneyInputs = document.querySelectorAll('.money');
    moneyInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (val) e.target.value = Number(val).toLocaleString('de-CH').replace(/,/g, "'");
        });
    });
});


// ==========================================
// 2. HILFSFUNKTIONEN
// ==========================================

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
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 0
    }).format(num);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}


// ==========================================
// 3. HAUPT-ANALYSE
// ==========================================

function startAnalysis(e) {
    if (e) e.preventDefault(); // Verhindert Neuladen der Seite

    // --- KONSTANTEN ---
    const LIMIT_AFFORDABILITY = 33.33; // Die strenge 33.33% Hürde
    const RATE_CALC = 0.05; // 5% kalkulatorischer Zins

    // --- A. DATEN EINLESEN ---

    // Käufer 1
    const inc1 = parseMoney('income_b1');
    const bonus1 = parseMoney('bonus_b1');
    const pensOld1 = parseMoney('pension_old_b1'); // Altersrente
    const pensDis1 = parseMoney('pension_dis_b1'); // Invalidenrente
    const pensSur1 = parseMoney('pension_sur_b1'); // Hinterlassenenrente (für Partner)
    const age1 = getAge('birthdate_b1');

    // Käufer 2
    const inc2 = parseMoney('income_b2');
    const bonus2 = parseMoney('bonus_b2');
    const pensOld2 = parseMoney('pension_old_b2');
    const pensDis2 = parseMoney('pension_dis_b2');
    const pensSur2 = parseMoney('pension_sur_b2');
    const age2 = getAge('birthdate_b2');

    // Verbindlichkeiten (Schulden)
    const liab1 = parseMoney('liabilities_b1');
    const liab2 = parseMoney('liabilities_b2');
    const totalLiabilitiesYear = liab1 + liab2;

    // Objekt & Kosten
    const price = parseMoney('propertyPrice');
    const renovation = parseMoney('renovationCost');
    const buildYearVal = getSafeValue('buildYear');

    // Kaufnebenkosten
    const tax = parseMoney('tax_transfer');
    const notary = parseMoney('fee_notary');
    const registry = parseMoney('fee_registry');
    const noteFee = parseMoney('fee_mortgage');

    // Eigenmittel
    const eqCash = parseMoney('equityCash');
    const eq3a = parseMoney('equity3a');
    const eqPK = parseMoney('equityPK');

    // Validierung
    if (price < 10000) {
        alert("Bitte geben Sie einen gültigen Kaufpreis ein.");
        return;
    }

    // --- B. AGGREGATION ---
    const income1_total = inc1 + bonus1;
    const income2_total = inc2 + bonus2;
    const totalIncome = income1_total + income2_total;
    const totalEquity = eqCash + eq3a + eqPK;
    // Schätzung Rente (falls leer: 60% vom Lohn)
    const totalPension = (pensOld1 + pensOld2) > 0 ? (pensOld1 + pensOld2) : (totalIncome * 0.6);
    const maxAge = Math.max(age1, age2);


    // --- C. PHASE 1: ANSCHAFFUNG ---

    const totalBuyingFees = tax + notary + registry + noteFee;
    const totalObjektInvest = price + renovation; // Mehrkosten erhöhen Hypothekenbasis
    const mortgage = Math.max(0, totalObjektInvest - totalEquity);
    const lendingRatio = (totalObjektInvest > 0) ? (mortgage / totalObjektInvest) * 100 : 0;
    const totalCashNeeded = totalEquity + totalBuyingFees;

    // Output Phase 1
    setText('d_mortgage', fmtCHF(mortgage));
    setText('d_lending', `Belehnung: ${lendingRatio.toFixed(1)}%`);
    setText('d_buyingFees', fmtCHF(totalBuyingFees));
    setText('d_totalInvest', fmtCHF(totalObjektInvest));
    setText('d_cashNeeded', fmtCHF(totalCashNeeded));
    if (document.getElementById('d_equityTotal')) {
        setText('d_equityTotal', fmtCHF(totalEquity));
        setText('d_equitySplit', `Cash: ${fmtCHF(eqCash)} | PK/3a: ${fmtCHF(eq3a + eqPK)}`);
    }


    // --- D. PHASE 2: LAUFENDE KOSTEN (TRAGBARKEIT) ---

    const max1st = totalObjektInvest * 0.6666; // 2/3 Belehnung
    const mortgage2nd = Math.max(0, mortgage - max1st);

    // Amortisation (Dynamisch nach Alter)
    let yearsToRetire = 65 - maxAge;
    let amortDuration = 15;
    if (maxAge > 0) {
        if (yearsToRetire < 1) yearsToRetire = 1;
        amortDuration = Math.min(15, yearsToRetire);
    }

    // HEV-Satz (Baujahr)
    const currentYear = new Date().getFullYear();
    let buildingAge = 20;
    if (buildYearVal) buildingAge = currentYear - parseInt(buildYearVal);
    let hevRate = 0.008; // Altbau 0.8%
    if (buildingAge <= 10) hevRate = 0.005; // Neubau 0.5%

    // Kostenkomponenten
    const interestYear = mortgage * RATE_CALC;
    const amortYear = mortgage2nd / amortDuration;
    const maintenanceBank = totalObjektInvest * 0.01; // Bank rechnet immer 1%

    // Beratungswerte (HEV)
    const maintenanceReal = totalObjektInvest * 0.003; // ca. 0.3% Energie
    const maintenanceTotalHEV = totalObjektInvest * hevRate;
    const maintenanceSave = Math.max(0, maintenanceTotalHEV - maintenanceReal);

    // Tragbarkeit (Bank-Sicht)
    const housingCostsBank = interestYear + amortYear + maintenanceBank;
    const totalBurdenBank = housingCostsBank + totalLiabilitiesYear;
    const affordPct = (totalIncome > 0) ? (totalBurdenBank / totalIncome) * 100 : 0;

    // Output Phase 2 (Basis)
    setText('d_interestYear', fmtCHF(interestYear));
    setText('d_amortYear', fmtCHF(amortYear));
    setText('d_maintenanceSave', fmtCHF(maintenanceSave));
    setText('d_maintenanceReal', fmtCHF(maintenanceReal));

    // Ampel Phase 2
    const bar = document.getElementById('d_affordabilityBar');
    const barText = document.getElementById('d_affordabilityText');
    if (bar) {
        bar.style.width = Math.min(affordPct, 100) + "%";
        if (affordPct <= 33.33) {
            bar.style.background = "var(--good)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Gut)`;
        } else if (affordPct <= 38) {
            bar.style.background = "var(--warning)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Erhöht)`;
        } else {
            bar.style.background = "var(--danger)";
            barText.textContent = `Tragbarkeit: ${affordPct.toFixed(2)}% (Kritisch)`;
        }
    }


    // --- E. RISIKO-CHECK (INVALIDITÄT & TOD) ---

    // Wir müssen wissen: Welches Einkommen ist nötig für 33.33% Tragbarkeit?
    const requiredIncome = totalBurdenBank / (LIMIT_AFFORDABILITY / 100);

    // 1. Szenario: Invalidität
    // Worst Case: Das tiefere Haushaltseinkommen bei Ausfall einer Person
    // Fall A: Person 1 invalid -> Rente1 + Lohn2
    const incInv1 = pensDis1 + income2_total;
    // Fall B: Person 2 invalid -> Lohn1 + Rente2
    const incInv2 = income1_total + pensDis2;
    
    let riskIncomeInv = Math.min(incInv1, incInv2);
    // Spezialfall Single:
    if (totalIncome === income1_total) riskIncomeInv = pensDis1;

    const gapInv = Math.max(0, requiredIncome - riskIncomeInv);
    const affordInvPct = (riskIncomeInv > 0) ? (totalBurdenBank / riskIncomeInv) * 100 : 0;

    // 2. Szenario: Todesfall
    // Fall A: Person 1 stirbt -> Lohn2 + Hinterlassenenrente(für 2)
    const incDeath1 = income2_total + pensSur1; // Rente aus der PK von Person 1
    // Fall B: Person 2 stirbt -> Lohn1 + Hinterlassenenrente(für 1)
    const incDeath2 = income1_total + pensSur2;

    let riskIncomeDeath = Math.min(incDeath1, incDeath2);
    if (totalIncome === income1_total) riskIncomeDeath = pensSur1; // Single (Erben?)

    const gapDeath = Math.max(0, requiredIncome - riskIncomeDeath);
    const affordDeathPct = (riskIncomeDeath > 0) ? (totalBurdenBank / riskIncomeDeath) * 100 : 0;

    // Output Risiko
    setText('d_gapInvalidity', fmtCHF(gapInv));
    setText('d_affordInvalidity', affordInvPct.toFixed(1) + "%");
    
    // Badge Invalidität
    const badgeInv = document.getElementById('d_statusInvalidity');
    const boxInv = document.getElementById('box_riskInv');
    if (badgeInv) {
        if (gapInv > 0) {
            badgeInv.textContent = "Versicherungslücke!";
            badgeInv.className = "badge badge-red";
            if(boxInv) boxInv.style.borderLeft = "4px solid var(--danger)";
        } else {
            badgeInv.textContent = "Tragbarkeit OK";
            badgeInv.className = "badge badge-green";
            if(boxInv) boxInv.style.borderLeft = "4px solid var(--good)";
        }
    }

    // Output Todesfall
    setText('d_gapDeath', fmtCHF(gapDeath));
    setText('d_affordDeath', affordDeathPct.toFixed(1) + "%");
    
    const badgeDeath = document.getElementById('d_statusDeath');
    const boxDeath = document.getElementById('box_riskDeath');
    if (badgeDeath) {
        if (gapDeath > 0) {
            badgeDeath.textContent = "Versicherungslücke!";
            badgeDeath.className = "badge badge-red";
            if(boxDeath) boxDeath.style.borderLeft = "4px solid var(--danger)";
        } else {
            badgeDeath.textContent = "Tragbarkeit OK";
            badgeDeath.className = "badge badge-green";
            if(boxDeath) boxDeath.style.borderLeft = "4px solid var(--good)";
        }
    }


    // --- F. PHASE 3: ZUKUNFT (RENTE) ---

    const restDebt = Math.min(mortgage, max1st); // 2. Hyp ist weg

    // Max Hypothek im Alter (Basis 33.33%)
    const maxAffordableCostPension = totalPension * (LIMIT_AFFORDABILITY / 100);
    const availableForInterest = maxAffordableCostPension - maintenanceBank - totalLiabilitiesYear;
    const maxMortgagePension = Math.max(0, availableForInterest / RATE_CALC);

    // Lücke (Gap)
    const fundingGap = Math.max(0, restDebt - maxMortgagePension);

    // Tragbarkeit Rente
    const interestPension = restDebt * RATE_CALC;
    const burdenPension = interestPension + maintenanceBank + totalLiabilitiesYear;
    const affordPensionPct = (totalPension > 0) ? (burdenPension / totalPension) * 100 : 0;

    // Output Phase 3
    setText('d_restDebt', fmtCHF(restDebt));
    setText('d_maxMortgagePension', fmtCHF(maxMortgagePension));
    setText('d_gapTotal', fmtCHF(fundingGap));
    setText('d_pensionAffordability', affordPensionPct.toFixed(1) + "%");

    const gapBadge = document.getElementById('d_gapBadge');
    const boxGap = document.getElementById('box_gapTotal');
    if (gapBadge) {
        if (fundingGap > 0) {
            gapBadge.textContent = "Unterdeckung!";
            gapBadge.className = "badge badge-red";
            if(boxGap) boxGap.style.borderColor = "var(--danger)";
        } else {
            gapBadge.textContent = "Finanzierung gesichert";
            gapBadge.className = "badge badge-green";
            if(boxGap) boxGap.style.borderColor = "var(--good)";
        }
    }

    const penBadge = document.getElementById('d_pensionStatus');
    if (penBadge) {
        if (affordPensionPct <= 33.33) {
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
    if (inputDiv && dashDiv) {
        inputDiv.style.display = 'none';
        dashDiv.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function submitLead(e) {
    if (e) e.preventDefault();
    alert("Vielen Dank! Ihre Daten wurden zur Prüfung übermittelt.");
}

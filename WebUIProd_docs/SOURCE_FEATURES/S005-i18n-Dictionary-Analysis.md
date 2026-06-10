# S005 - Internationalization (i18n) Dictionary Analysis

## Source Files
- `src/old/EcransSeatPly/inclus/dictionnaire.cfm` - Translation loader
- `elements/dictionnaire/dictionnaire.xls` - Excel translation file (external)

---

## 1. Dictionary Loading Mechanism

The legacy system loads translations from an Excel file using Apache POI:

```cfm
// 1. Read Excel file using Java POI
// 2. Loop through rows (column1=variable, column2=FR, column3=EN, column4=ES)
// 3. Set each variable dynamically based on session.Langue
<cfloop query="qCell">
    <cfset Variable = column1>
    <cfif session.Langue EQ "EN">
        <cfset '#Variable#' = column3>
    <cfelseif session.Langue EQ "FR">
        <cfset '#Variable#' = column2>
    <cfelse>
        <cfset '#Variable#' = column4>  // Spanish
    </cfif>
</cfloop>
```

---

## 2. Excel File Structure

| Column 1 | Column 2 (FR) | Column 3 (EN) | Column 4 (ES) |
|----------|---------------|---------------|---------------|
| LeTitreCommande | Commande | Order | Pedido |
| LeTitreClient | Client | Client | Cliente |
| ... | ... | ... | ... |

---

## 3. Key Translation Variables (LeTitre* Pattern)

### Core Screen Labels
| Variable | French | English |
|----------|--------|---------|
| LeTitreCommande | Commande | Order |
| LeTitreClient | Client | Client |
| LeTitreProduit | Produit | Product |
| LeTitreOperation | Operation | Operation |
| LeTitreMachine | Machine | Machine |
| LeTitreStatut | Statut | Status |
| LeTitreQte | Quantite | Quantity |
| LeTitreQteRestante | Reste | Remaining |
| LeTitreDefect | Defectueux | Defect |

### Quantity Labels
| Variable | French | English |
|----------|--------|---------|
| LeTitrePressee | Pressee | Pressed |
| LeTitreMachinee | Machinee | Machined |
| LeTitreUtilisee | Utilisee | Used |
| LeTitreProduite | Produite | Produced |

### Press/Mold Terms
| Variable | French | English |
|----------|--------|---------|
| LeTitreMoule | Moule | Mold |
| LeTitreTypeMoule | Type moule | Mold Type |
| LeTitrePiecesParCavite | Pieces/Cavite | Pieces/Cavity |
| LeTitreCavitesParMoule | Cavites/Moule | Cavities/Mold |
| LeTitreEpaisseur | Epaisseur | Thickness |
| LeTitreTempsCuisson | Temps cuisson | Cook Time |
| LeTitreTempsRefroidir | Temps refroidir | Cool Time |
| LeTitreEcart | Ecart | Gap |
| LeTitrePanneau | Panneau | Panel |

### Materials & Inventory
| Variable | French | English |
|----------|--------|---------|
| LeTitreMatierePremiere | Matiere premiere | Raw Material |
| LeTitreEnPlace | En place | In Place |
| LeTitreConsommeMateriel | Consomme materiel | Consumes Material |
| LeTitreCreeInventaire | Cree inventaire | Creates Inventory |
| LeTitreEspece | Espece | Species |
| LeTitreCoupe | Coupe | Cut |
| LeTitreGrain | Grain | Grain |
| LeTitreGrade | Grade | Grade |

### Production Details
| Variable | French | English |
|----------|--------|---------|
| LeTitreSeq | Seq | Seq |
| LeTitreGroupe | Groupe | Group |
| LeTitreType | Type | Type |
| LeTitreNote | Note | Note |
| LeTitreSKID | SKID | SKID |
| LeTitreEntrepot | Entrepot | Warehouse |
| LeTitreDescription | Description | Description |

### Dates & Times
| Variable | French | English |
|----------|--------|---------|
| LeTitreDebutProg | Debut prog. | Sched. Start |
| LeTitreDebutReel | Debut reel | Actual Start |
| LeTitreDisponible | Disponible | Available |
| LeTitreAssignee | Assignee | Assigned |
| LeTitreA | a | at |

### Status & Actions
| Variable | French | English |
|----------|--------|---------|
| LeTitreConsulter | Consulter | View |
| LeTitreSousPPAP | Sous PPAP | Under PPAP |
| LeTitreApprobationSuperviseur | Approbation superviseur | Supervisor Approval |
| LeTitreProchaineEtape | Prochaine etape | Next Step |

### Yes/No
| Variable | French | English |
|----------|--------|---------|
| LeTitreOui | Oui | Yes |
| LeTitreNon | Non | No |

---

## 4. Message Variables (LeMessage* Pattern)

| Variable | French | English |
|----------|--------|---------|
| LeMessageDecoupageNonRequis | Decoupage non requis | Cutting not required |
| LeMessageNePasPresser | NE PAS PRESSER | DO NOT PRESS |
| LeMessageAucunContenant | Aucun contenant | No container |

---

## 5. Format Variables (LeFormat* Pattern)

| Variable | Purpose | Example FR | Example EN |
|----------|---------|------------|------------|
| LeFormatDateMoyen | Medium date | dd mmm yyyy | mmm dd, yyyy |
| LeFormatTempsCourt | Short time | HH:mm | h:mm tt |
| LaLocale | Date locale | fr_CA | en_US |

---

## 6. Questionnaire Variables

| Variable | French | English |
|----------|--------|---------|
| LeTitreQuestionnaireSortie | Questionnaire de sortie | Exit Survey |
| LeTitreCauseArret | Cause arret | Stop Cause |
| LeTitreCausePrincipaleArret | Cause principale | Primary Cause |
| LeTitreCauseSecondaireArret | Cause secondaire | Secondary Cause |
| LeTitreAutrePreciser | Autre (preciser) | Other (specify) |
| LeTitreConserverLeMoule | Conserver le moule | Keep the mold |
| LeTitreDesinstallerLeMoule | Desinstaller le moule | Uninstall mold |
| LeTitreAction | Action | Action |

---

## 7. Modal/Dialog Variables

| Variable | Purpose |
|----------|---------|
| LeTitreAttendre | Loading/waiting title |
| LeTitreErreur | Error title |
| LeTitreAvertissement | Warning title |
| LeTitreConfirmation | Confirmation title |

---

## 8. Migration Strategy

### Recommended Approach
Create JSON-based i18n files for React:

**`src/locales/fr.json`:**
```json
{
  "order": {
    "title": "Commande",
    "client": "Client",
    "product": "Produit",
    "quantity": "Quantite",
    "remaining": "Reste",
    "defect": "Defectueux"
  },
  "operation": {
    "title": "Operation",
    "machine": "Machine",
    "status": "Statut"
  },
  "press": {
    "mold": "Moule",
    "moldType": "Type moule",
    "piecesPerCavity": "Pieces/Cavite",
    "thickness": "Epaisseur",
    "cookTime": "Temps cuisson",
    "coolTime": "Temps refroidir"
  },
  "common": {
    "yes": "Oui",
    "no": "Non",
    "at": "a"
  },
  "questionnaire": {
    "exitSurvey": "Questionnaire de sortie",
    "stopCause": "Cause arret",
    "primaryCause": "Cause principale",
    "secondaryCause": "Cause secondaire"
  }
}
```

**`src/locales/en.json`:**
```json
{
  "order": {
    "title": "Order",
    "client": "Client",
    "product": "Product",
    "quantity": "Quantity",
    "remaining": "Remaining",
    "defect": "Defect"
  },
  // ... etc
}
```

### Implementation with i18next
```tsx
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: { fr, en },
    lng: 'fr',  // default to French
    fallbackLng: 'fr',
  });

// Usage in components:
const { t } = useTranslation();
return <h1>{t('order.title')}</h1>; // "Commande" or "Order"
```

---

## 9. Complete Translation Count

Based on grep patterns:
- `LeTitre*` variables: ~80+ unique labels
- `LeMessage*` variables: ~15+ messages
- `LeFormat*` variables: ~5 format strings
- Total estimated: **100+ translation keys**

---

## 10. Notes for Migration

1. **Default Language**: French (FR) - most UI labels are primarily French
2. **Uppercase Convention**: All legacy labels use `UCase()` - consider whether to maintain this
3. **Dynamic Loading**: Legacy loads from Excel; recommend static JSON for React
4. **No Spanish in UI**: Spanish (ES) exists in Excel but not actively used in UI code

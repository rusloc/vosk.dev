# Lead engine export: companies (2026-10-20)

Exported from Supabase `public.companies` (joined to `public.leads`) on 2026-10-20, ahead of the
planned teardown of the lead engine (`vosk_leads`). **Once its tables are dropped, this file is the
only copy.** `public.contacts` had 0 rows, so there is nothing to export for contacts.

- **1193 companies**, all sourced from the Himalayas remote-jobs board (the engine's only source).
- The companies table held only a name, a region and a Himalayas slug. Domain, country, size, industry,
  LinkedIn and website were never filled. The columns below add lead figures from `public.leads`.
- **Leads**: postings that became leads for the company. **Top score**: the best LLM fit score (0–100)
  among them, scored up to 2026-09-23, when enrichment stopped. **Last posted**: the newest posting date.
- Sorted by top score, then lead count. Companies with 0 leads were fetched but never scored.

| Company | Region | Leads | Top score | Last posted | Link |
|---|---|---:|---:|---|---|
| goPro Consultancy Group ltd. | GLOBAL | 35 | 94 | 2026-09-16 | [himalayas](https://himalayas.app/companies/gopro-consultancy-group-ltd) |
| Relief International | GLOBAL | 1 | 92 | 2026-08-29 | [himalayas](https://himalayas.app/companies/relief-international) |
| Solidigm | GLOBAL | 1 | 88 | 2026-09-13 | [himalayas](https://himalayas.app/companies/solidigm-com) |
| phData | GLOBAL | 3 | 87 | 2026-09-18 | [himalayas](https://himalayas.app/companies/phdata) |
| iRESTORE | GLOBAL | 1 | 86 | 2026-09-08 | [himalayas](https://himalayas.app/companies/irestore) |
| Virtasant | GLOBAL | 1 | 86 | 2026-09-09 | [himalayas](https://himalayas.app/companies/virtasant) |
| micro1 | GLOBAL | 1 | 85 | 2026-08-30 | [himalayas](https://himalayas.app/companies/micro1) |
| Tabby | GLOBAL | 6 | 84 | 2026-09-05 | [himalayas](https://himalayas.app/companies/tabby) |
| Newsela | GLOBAL | 2 | 84 | 2026-09-18 | [himalayas](https://himalayas.app/companies/newsela) |
| ETHjuniors | GLOBAL | 1 | 84 | 2026-09-05 | [himalayas](https://himalayas.app/companies/ethjuniors) |
| Homeward | GLOBAL | 1 | 84 | 2026-09-04 | [himalayas](https://himalayas.app/companies/homeward) |
| Stellar Tech | GLOBAL | 1 | 84 | 2026-09-04 | [himalayas](https://himalayas.app/companies/stellar-tech) |
| Massive Rocket | GLOBAL | 6 | 83 | 2026-09-10 | [himalayas](https://himalayas.app/companies/massive-rocket) |
| iScale Solutions | GLOBAL | 1 | 83 | 2026-09-16 | [himalayas](https://himalayas.app/companies/iscale-solutions) |
| Capitex | GLOBAL | 3 | 82 | 2026-09-18 | [himalayas](https://himalayas.app/companies/capitex) |
| Leega Consultoria | GLOBAL | 3 | 82 | 2026-09-14 | [himalayas](https://himalayas.app/companies/leega-consultoria) |
| Ryz Labs | GLOBAL | 1 | 82 | 2026-09-10 | [himalayas](https://himalayas.app/companies/ryz-labs) |
| Sasso Consulting (Pty) Ltd | GLOBAL | 1 | 80 | 2026-09-14 | [himalayas](https://himalayas.app/companies/sasso-consulting-pty-ltd) |
| Entrada AI | GLOBAL | 3 | 79 | 2026-09-07 | [himalayas](https://himalayas.app/companies/entrada-ai) |
| Hunt St | GLOBAL | 1 | 79 | 2026-08-30 | [himalayas](https://himalayas.app/companies/hunt-st) |
| LUZA Group | GLOBAL | 3 | 78 | 2026-09-19 | [himalayas](https://himalayas.app/companies/luza-group) |
| Myers-Holum | GLOBAL | 2 | 78 | 2026-09-19 | [himalayas](https://himalayas.app/companies/myers-holum) |
| mercor | GLOBAL | 11 | 77 | 2026-09-15 | [himalayas](https://himalayas.app/companies/mercor) |
| Infotree Global Solutions | GLOBAL | 1 | 77 | 2026-08-29 | [himalayas](https://himalayas.app/companies/infotree-global-solutions) |
| Rosie's People | GLOBAL | 1 | 77 | 2026-09-04 | [himalayas](https://himalayas.app/companies/rosie-s-people) |
| Delan Associates | GLOBAL | 3 | 76 | 2026-09-17 | [himalayas](https://himalayas.app/companies/delan-associates) |
| Renmoney | GLOBAL | 2 | 76 | 2026-09-11 | [himalayas](https://himalayas.app/companies/renmoney) |
| Turnitin, LLC | GLOBAL | 2 | 76 | 2026-09-18 | [himalayas](https://himalayas.app/companies/turnitin-llc) |
| Kodify Media Group | GLOBAL | 1 | 76 | 2026-08-31 | [himalayas](https://himalayas.app/companies/kodify-media-group) |
| NANOSOFT CONSULTING TALENT PAGE | GLOBAL | 1 | 76 | 2026-09-11 | [himalayas](https://himalayas.app/companies/nanosoft-consulting-talent-page) |
| Alia Services | GLOBAL | 1 | 75 | 2026-09-06 | [himalayas](https://himalayas.app/companies/alia-services) |
| Blue Acorn iCi | GLOBAL | 1 | 75 | 2026-09-04 | [himalayas](https://himalayas.app/companies/blue-acorn-ici) |
| Data Ideology | GLOBAL | 1 | 75 | 2026-09-06 | [himalayas](https://himalayas.app/companies/data-ideology) |
| IT Advantage | GLOBAL | 1 | 75 | 2026-09-18 | [himalayas](https://himalayas.app/companies/it-advantage) |
| Rapinno Tech | GLOBAL | 1 | 75 | 2026-09-08 | [himalayas](https://himalayas.app/companies/rapinno-tech) |
| Welo Global | GLOBAL | 1 | 75 | 2026-09-05 | [himalayas](https://himalayas.app/companies/welo-global) |
| Cotiviti | GLOBAL | 6 | 74 | 2026-09-19 | [himalayas](https://himalayas.app/companies/cotiviti) |
| EngiFlex | GLOBAL | 6 | 74 | 2026-09-18 | [himalayas](https://himalayas.app/companies/engiflex) |
| Talan | GLOBAL | 3 | 74 | 2026-09-17 | [himalayas](https://himalayas.app/companies/talan) |
| NearSource Technologies | GLOBAL | 2 | 74 | 2026-09-17 | [himalayas](https://himalayas.app/companies/nearsource-technologies) |
| Venon Solutions | GLOBAL | 1 | 73 | 2026-09-02 | [himalayas](https://himalayas.app/companies/venon-solutions) |
| Software Mind | GLOBAL | 5 | 72 | 2026-09-13 | [himalayas](https://himalayas.app/companies/software-mind) |
| Interwell Health | GLOBAL | 2 | 72 | 2026-09-13 | [himalayas](https://himalayas.app/companies/interwell-health) |
| NUVIEW | GLOBAL | 2 | 72 | 2026-09-08 | [himalayas](https://himalayas.app/companies/nuview) |
| Collectiv | GLOBAL | 1 | 72 | 2026-09-08 | [himalayas](https://himalayas.app/companies/collectiv) |
| Concurrency | GLOBAL | 1 | 72 | 2026-09-19 | [himalayas](https://himalayas.app/companies/concurrency) |
| Decision Inc. | GLOBAL | 1 | 72 | 2026-09-05 | [himalayas](https://himalayas.app/companies/decision-inc) |
| RecargaPay | GLOBAL | 1 | 72 | 2026-08-30 | [himalayas](https://himalayas.app/companies/recargapay) |
| Twilio | GLOBAL | 1 | 72 | 2026-09-09 | [himalayas](https://himalayas.app/companies/twilio) |
| Arcadia | GLOBAL | 1 | 71 | 2026-08-31 | [himalayas](https://himalayas.app/companies/arcadia-io) |
| Careerswift | GLOBAL | 4 | 70 | 2026-09-10 | [himalayas](https://himalayas.app/companies/careerswift) |
| Improvado | GLOBAL | 2 | 70 | 2026-09-17 | [himalayas](https://himalayas.app/companies/improvado) |
| Arkatechture | GLOBAL | 1 | 70 | 2026-09-13 | [himalayas](https://himalayas.app/companies/arkatechture) |
| Array | GLOBAL | 1 | 70 | 2026-09-08 | [himalayas](https://himalayas.app/companies/array) |
| Avant Digital | GLOBAL | 1 | 70 | 2026-08-30 | [himalayas](https://himalayas.app/companies/avant-digital) |
| Pull Skil | GLOBAL | 1 | 70 | 2026-09-07 | [himalayas](https://himalayas.app/companies/pull-skil) |
| Humana | GLOBAL | 7 | 69 | 2026-09-10 | [himalayas](https://himalayas.app/companies/humana) |
| Hire Hangar | GLOBAL | 2 | 69 | 2026-09-02 | [himalayas](https://himalayas.app/companies/hire-hangar) |
| Agility Robotics | GLOBAL | 1 | 69 | 2026-09-05 | [himalayas](https://himalayas.app/companies/agility-robotics) |
| Chainguard | GLOBAL | 1 | 69 | 2026-09-13 | [himalayas](https://himalayas.app/companies/chainguard) |
| Donnelley Financial Solutions | GLOBAL | 1 | 69 | 2026-09-06 | [himalayas](https://himalayas.app/companies/donnelley-financial-solutions) |
| iSpeedtoLead | GLOBAL | 1 | 69 | 2026-09-17 | [himalayas](https://himalayas.app/companies/ispeedtolead) |
| Scale Media | GLOBAL | 1 | 69 | 2026-09-05 | [himalayas](https://himalayas.app/companies/scale-media) |
| Joyful Craftsmen AG | GLOBAL | 8 | 68 | 2026-09-18 | [himalayas](https://himalayas.app/companies/joyful-craftsmen-ag) |
| TrustYou | GLOBAL | 4 | 68 | 2026-09-14 | [himalayas](https://himalayas.app/companies/trustyou) |
| Philo | GLOBAL | 1 | 68 | 2026-08-30 | [himalayas](https://himalayas.app/companies/philo) |
| Radiology Partners | GLOBAL | 1 | 68 | 2026-09-19 | [himalayas](https://himalayas.app/companies/radpartners-avature) |
| Mutt Data | GLOBAL | 7 | 67 | 2026-09-19 | [himalayas](https://himalayas.app/companies/mutt-data) |
| TheHiveCareers | GLOBAL | 6 | 67 | 2026-09-13 | [himalayas](https://himalayas.app/companies/thehivecareers) |
| DoiT International | GLOBAL | 4 | 67 | 2026-09-15 | [himalayas](https://himalayas.app/companies/doit-international) |
| Ferguson | GLOBAL | 3 | 67 | 2026-09-19 | [himalayas](https://himalayas.app/companies/ferguson-com) |
| BBQ - Baumann Bildung und Qualifizierung GmbH | GLOBAL | 1 | 67 | 2026-09-15 | [himalayas](https://himalayas.app/companies/bbq-baumann-bildung-und-qualifizierung-gmbh) |
| Dine Development Corporation | GLOBAL | 1 | 67 | 2026-09-18 | [himalayas](https://himalayas.app/companies/dine-development-corporation) |
| IDBC Kft | GLOBAL | 1 | 67 | 2026-09-04 | [himalayas](https://himalayas.app/companies/idbc-kft) |
| Impiricus | GLOBAL | 1 | 67 | 2026-09-11 | [himalayas](https://himalayas.app/companies/impiricus) |
| Softtest pays pty ltd | GLOBAL | 1 | 67 | 2026-09-11 | [himalayas](https://himalayas.app/companies/softtest-pays-pty-ltd) |
| TechBiz Global | GLOBAL | 4 | 66 | 2026-09-09 | [himalayas](https://himalayas.app/companies/techbiz-global) |
| Concentrix | GLOBAL | 3 | 66 | 2026-09-03 | [himalayas](https://himalayas.app/companies/concentrix) |
| Inchcape Shipping Services | GLOBAL | 2 | 66 | 2026-09-08 | [himalayas](https://himalayas.app/companies/inchcape-shipping-services) |
| Aimpoint Digital | GLOBAL | 1 | 66 | 2026-09-08 | [himalayas](https://himalayas.app/companies/aimpoint-digital) |
| JobGet | GLOBAL | 1 | 66 | 2026-09-13 | [himalayas](https://himalayas.app/companies/jobget) |
| General Dynamics Information Technology | GLOBAL | 19 | 65 | 2026-09-18 | [himalayas](https://himalayas.app/companies/general-dynamics-information-technology) |
| Nagarro | GLOBAL | 4 | 65 | 2026-09-13 | [himalayas](https://himalayas.app/companies/nagarro) |
| Rackner | GLOBAL | 2 | 65 | 2026-09-15 | [himalayas](https://himalayas.app/companies/rackner) |
| Aceable | GLOBAL | 1 | 65 | 2026-09-19 | [himalayas](https://himalayas.app/companies/aceable) |
| Afresh | GLOBAL | 1 | 65 | 2026-09-13 | [himalayas](https://himalayas.app/companies/afresh) |
| ALTEN | GLOBAL | 1 | 65 | 2026-09-05 | [himalayas](https://himalayas.app/companies/alten) |
| Cogniify | GLOBAL | 1 | 65 | 2026-09-05 | [himalayas](https://himalayas.app/companies/cogniify) |
| Doma | GLOBAL | 1 | 65 | 2026-09-10 | [himalayas](https://himalayas.app/companies/doma) |
| Helpware | GLOBAL | 1 | 65 | 2026-09-08 | [himalayas](https://himalayas.app/companies/helpware) |
| PlayStation Global | GLOBAL | 1 | 65 | 2026-09-04 | [himalayas](https://himalayas.app/companies/playstation-global) |
| SRM Technologies | GLOBAL | 1 | 65 | 2026-09-09 | [himalayas](https://himalayas.app/companies/srm-technologies) |
| Torc Robotics | GLOBAL | 1 | 65 | 2026-09-03 | [himalayas](https://himalayas.app/companies/torc-robotics) |
| Westinghouse Electric Company | GLOBAL | 1 | 65 | 2026-08-30 | [himalayas](https://himalayas.app/companies/westinghouse-electric-company) |
| emerchantpay | GLOBAL | 2 | 64 | 2026-09-19 | [himalayas](https://himalayas.app/companies/emerchantpay) |
| Praxis Precision Medicines | GLOBAL | 2 | 64 | 2026-09-19 | [himalayas](https://himalayas.app/companies/praxis-precision-medicines) |
| All Your BI | GLOBAL | 1 | 64 | 2026-09-14 | [himalayas](https://himalayas.app/companies/all-your-bi) |
| Bridgeway Benefit Technologies | GLOBAL | 1 | 64 | 2026-09-03 | [himalayas](https://himalayas.app/companies/bridgeway-benefit-technologies) |
| Brighty App | GLOBAL | 1 | 64 | 2026-08-30 | [himalayas](https://himalayas.app/companies/brighty-app) |
| John Deere | GLOBAL | 1 | 64 | 2026-09-18 | [himalayas](https://himalayas.app/companies/john-deere) |
| Metova | GLOBAL | 1 | 64 | 2026-09-01 | [himalayas](https://himalayas.app/companies/metova) |
| Miratech | GLOBAL | 1 | 64 | 2026-08-30 | [himalayas](https://himalayas.app/companies/miratech) |
| Paired | GLOBAL | 1 | 64 | 2026-09-06 | [himalayas](https://himalayas.app/companies/paired-so) |
| Redcare Pharmacy | GLOBAL | 1 | 64 | 2026-09-04 | [himalayas](https://himalayas.app/companies/redcare-pharmacy) |
| ShyftLabs | GLOBAL | 1 | 64 | 2026-09-15 | [himalayas](https://himalayas.app/companies/shyftlabs) |
| Talent Sam | GLOBAL | 1 | 64 | 2026-09-02 | [himalayas](https://himalayas.app/companies/talent-sam) |
| Versant Media | GLOBAL | 1 | 64 | 2026-09-04 | [himalayas](https://himalayas.app/companies/versant-media) |
| NTT DATA | GLOBAL | 6 | 63 | 2026-09-14 | [himalayas](https://himalayas.app/companies/nttdata) |
| Lookout | GLOBAL | 2 | 63 | 2026-09-04 | [himalayas](https://himalayas.app/companies/lookout) |
| EverCommerce | GLOBAL | 1 | 63 | 2026-08-31 | [himalayas](https://himalayas.app/companies/evercommerce) |
| InPost | GLOBAL | 1 | 63 | 2026-09-03 | [himalayas](https://himalayas.app/companies/inpost) |
| Montage Health | GLOBAL | 1 | 63 | 2026-09-17 | [himalayas](https://himalayas.app/companies/montage-health) |
| PadSplit | GLOBAL | 1 | 63 | 2026-09-04 | [himalayas](https://himalayas.app/companies/padsplit) |
| Sky Zone | GLOBAL | 1 | 63 | 2026-09-06 | [himalayas](https://himalayas.app/companies/sky-zone) |
| Zencore | GLOBAL | 1 | 63 | 2026-09-19 | [himalayas](https://himalayas.app/companies/zencore) |
| Keyrus | GLOBAL | 3 | 62 | 2026-09-14 | [himalayas](https://himalayas.app/companies/keyrus) |
| SDG Group | GLOBAL | 3 | 62 | 2026-09-10 | [himalayas](https://himalayas.app/companies/sdg-group) |
| NMI | GLOBAL | 2 | 62 | 2026-09-03 | [himalayas](https://himalayas.app/companies/nmi) |
| Flinks | GLOBAL | 1 | 62 | 2026-09-06 | [himalayas](https://himalayas.app/companies/flinks) |
| Hach | GLOBAL | 1 | 62 | 2026-09-03 | [himalayas](https://himalayas.app/companies/hach) |
| Innovative Solutions | GLOBAL | 1 | 62 | 2026-08-29 | [himalayas](https://himalayas.app/companies/innovative-solutions) |
| Jupiter Intelligence, Inc. | GLOBAL | 1 | 62 | 2026-09-13 | [himalayas](https://himalayas.app/companies/jupiter-intelligence-inc) |
| KData Inc. | GLOBAL | 1 | 62 | 2026-08-31 | [himalayas](https://himalayas.app/companies/kdata-inc) |
| KoBold Metals | GLOBAL | 1 | 62 | 2026-09-06 | [himalayas](https://himalayas.app/companies/kobold-metals) |
| Reliance Health | GLOBAL | 1 | 62 | 2026-09-19 | [himalayas](https://himalayas.app/companies/reliance-health) |
| SmartLight Analytics | GLOBAL | 1 | 62 | 2026-09-14 | [himalayas](https://himalayas.app/companies/smartlight-analytics) |
| KinderCare Education, LLC | GLOBAL | 2 | 61 | 2026-09-14 | [himalayas](https://himalayas.app/companies/kindercare-education-llc) |
| OLX | GLOBAL | 2 | 61 | 2026-09-10 | [himalayas](https://himalayas.app/companies/olxgroup) |
| ABOUT YOU SE & Co. KG | GLOBAL | 1 | 61 | 2026-09-19 | [himalayas](https://himalayas.app/companies/aboutyou) |
| Amplemarket | GLOBAL | 1 | 61 | 2026-09-18 | [himalayas](https://himalayas.app/companies/amplemarket) |
| Booker DiMaio, LLC | GLOBAL | 1 | 61 | 2026-09-14 | [himalayas](https://himalayas.app/companies/booker-dimaio-llc) |
| Borrowell | GLOBAL | 1 | 61 | 2026-09-06 | [himalayas](https://himalayas.app/companies/borrowell) |
| Clera | GLOBAL | 1 | 61 | 2026-09-10 | [himalayas](https://himalayas.app/companies/clera) |
| FYUL | GLOBAL | 1 | 61 | 2026-09-18 | [himalayas](https://himalayas.app/companies/fyul) |
| J29, Inc | GLOBAL | 1 | 61 | 2026-09-06 | [himalayas](https://himalayas.app/companies/j29-inc) |
| VirtuHire | GLOBAL | 1 | 61 | 2026-08-31 | [himalayas](https://himalayas.app/companies/virtuhire) |
| WVU Medicine | GLOBAL | 1 | 61 | 2026-09-10 | [himalayas](https://himalayas.app/companies/wvu-medicine) |
| Bright Vision Technologies | GLOBAL | 15 | 60 | 2026-09-19 | [himalayas](https://himalayas.app/companies/bright-vision-technologies) |
| Logistics Management Institute | GLOBAL | 3 | 60 | 2026-09-17 | [himalayas](https://himalayas.app/companies/logistics-management-institute) |
| Intetics | GLOBAL | 2 | 60 | 2026-09-10 | [himalayas](https://himalayas.app/companies/intetics) |
| Lingaro | GLOBAL | 2 | 60 | 2026-09-13 | [himalayas](https://himalayas.app/companies/lingaro) |
| Applaudo | GLOBAL | 1 | 60 | 2026-08-31 | [himalayas](https://himalayas.app/companies/applaudo) |
| Coderio | GLOBAL | 1 | 60 | 2026-09-04 | [himalayas](https://himalayas.app/companies/coderio) |
| Doximity | GLOBAL | 1 | 60 | 2026-09-13 | [himalayas](https://himalayas.app/companies/doximity) |
| Fresh Consulting | GLOBAL | 1 | 60 | 2026-09-05 | [himalayas](https://himalayas.app/companies/fresh-consulting) |
| Future Processing | GLOBAL | 1 | 60 | 2026-08-28 | [himalayas](https://himalayas.app/companies/future-processing) |
| Intertek | GLOBAL | 1 | 60 | 2026-09-08 | [himalayas](https://himalayas.app/companies/intertek) |
| SmithRx | GLOBAL | 1 | 60 | 2026-08-30 | [himalayas](https://himalayas.app/companies/smithrx) |
| Taraki | GLOBAL | 1 | 60 | 2026-09-06 | [himalayas](https://himalayas.app/companies/taraki) |
| Sigma Software | GLOBAL | 5 | 59 | 2026-09-18 | [himalayas](https://himalayas.app/companies/sigma-software-e561c036-16e4-4b2c-aa28-a33af9f3750b) |
| Instacart | GLOBAL | 3 | 59 | 2026-09-03 | [himalayas](https://himalayas.app/companies/instacart) |
| Asaas | GLOBAL | 1 | 59 | 2026-09-19 | [himalayas](https://himalayas.app/companies/asaas) |
| Dscout | GLOBAL | 1 | 59 | 2026-08-29 | [himalayas](https://himalayas.app/companies/dscout) |
| JWay Group, Inc. | GLOBAL | 1 | 59 | 2026-09-12 | [himalayas](https://himalayas.app/companies/jway-group-inc) |
| Keyrock | GLOBAL | 1 | 59 | 2026-08-29 | [himalayas](https://himalayas.app/companies/keyrock-com) |
| Sourcefit | GLOBAL | 1 | 59 | 2026-09-08 | [himalayas](https://himalayas.app/companies/sourcefit) |
| Vaya Health | GLOBAL | 1 | 59 | 2026-09-16 | [himalayas](https://himalayas.app/companies/vaya-health) |
| Lifelancer | GLOBAL | 5 | 58 | 2026-09-08 | [himalayas](https://himalayas.app/companies/lifelancer) |
| Sentara Health | GLOBAL | 3 | 58 | 2026-09-15 | [himalayas](https://himalayas.app/companies/sentara-health) |
| Sutherland | GLOBAL | 3 | 58 | 2026-09-10 | [himalayas](https://himalayas.app/companies/sutherland) |
| YipitData | GLOBAL | 3 | 58 | 2026-09-18 | [himalayas](https://himalayas.app/companies/yipitdata) |
| Central Health | GLOBAL | 2 | 58 | 2026-09-17 | [himalayas](https://himalayas.app/companies/central-health) |
| Novartis | GLOBAL | 2 | 58 | 2026-09-17 | [himalayas](https://himalayas.app/companies/novartis) |
| Porch Group | GLOBAL | 2 | 58 | 2026-09-18 | [himalayas](https://himalayas.app/companies/porch-group) |
| Acciona IT | GLOBAL | 1 | 58 | 2026-09-05 | [himalayas](https://himalayas.app/companies/acciona-it) |
| Atos | GLOBAL | 1 | 58 | 2026-08-31 | [himalayas](https://himalayas.app/companies/atos) |
| Comfrt | GLOBAL | 1 | 58 | 2026-08-28 | [himalayas](https://himalayas.app/companies/comfrt) |
| Navitus Health Solutions | GLOBAL | 1 | 58 | 2026-09-17 | [himalayas](https://himalayas.app/companies/navitus-health-solutions) |
| Reserv | GLOBAL | 1 | 58 | 2026-09-04 | [himalayas](https://himalayas.app/companies/reserv) |
| Sport Alliance GmbH | GLOBAL | 1 | 58 | 2026-09-17 | [himalayas](https://himalayas.app/companies/sport-alliance-gmbh) |
| Verantos | GLOBAL | 1 | 58 | 2026-09-15 | [himalayas](https://himalayas.app/companies/verantos) |
| Binance | GLOBAL | 4 | 57 | 2026-09-19 | [himalayas](https://himalayas.app/companies/binance) |
| J.D. Power | GLOBAL | 3 | 57 | 2026-09-13 | [himalayas](https://himalayas.app/companies/j-d-power) |
| Essnova Solutions, Inc. | GLOBAL | 2 | 57 | 2026-09-05 | [himalayas](https://himalayas.app/companies/essnova-solutions-inc) |
| gft | GLOBAL | 2 | 57 | 2026-09-19 | [himalayas](https://himalayas.app/companies/gft) |
| Koltin | GLOBAL | 2 | 57 | 2026-09-19 | [himalayas](https://himalayas.app/companies/koltin) |
| 3Pillar Global | GLOBAL | 1 | 57 | 2026-08-31 | [himalayas](https://himalayas.app/companies/3pillar-global) |
| Akumin | GLOBAL | 1 | 57 | 2026-09-17 | [himalayas](https://himalayas.app/companies/akumin) |
| Capgemini Technology Services | GLOBAL | 1 | 57 | 2026-09-05 | [himalayas](https://himalayas.app/companies/capgemini-technology-services) |
| DB \| CRESCER com propósito! | GLOBAL | 1 | 57 | 2026-09-13 | [himalayas](https://himalayas.app/companies/db-crescer-com-proposito) |
| Deploy | GLOBAL | 1 | 57 | 2026-09-08 | [himalayas](https://himalayas.app/companies/deploy) |
| Drivetrain | GLOBAL | 1 | 57 | 2026-09-18 | [himalayas](https://himalayas.app/companies/drivetrain) |
| FiscalNote | GLOBAL | 1 | 57 | 2026-09-19 | [himalayas](https://himalayas.app/companies/fiscalnote) |
| Fluent | GLOBAL | 1 | 57 | 2026-08-29 | [himalayas](https://himalayas.app/companies/fluent) |
| Growe | GLOBAL | 1 | 57 | 2026-08-31 | [himalayas](https://himalayas.app/companies/growe) |
| iiDENTIFii | GLOBAL | 1 | 57 | 2026-09-06 | [himalayas](https://himalayas.app/companies/iidentifii) |
| Iluma Alliance | GLOBAL | 1 | 57 | 2026-08-28 | [himalayas](https://himalayas.app/companies/iluma-alliance) |
| Keypath Education | GLOBAL | 1 | 57 | 2026-09-05 | [himalayas](https://himalayas.app/companies/keypath-education) |
| Live Nation Entertainment | GLOBAL | 1 | 57 | 2026-09-04 | [himalayas](https://himalayas.app/companies/live-nation-entertainment) |
| QHR | GLOBAL | 1 | 57 | 2026-09-05 | [himalayas](https://himalayas.app/companies/ovationhc) |
| Ryther | GLOBAL | 1 | 57 | 2026-09-14 | [himalayas](https://himalayas.app/companies/ryther) |
| TaskUs | GLOBAL | 1 | 57 | 2026-09-14 | [himalayas](https://himalayas.app/companies/taskus) |
| Wipfli | GLOBAL | 1 | 57 | 2026-08-30 | [himalayas](https://himalayas.app/companies/wipfli) |
| Wpromote | GLOBAL | 1 | 57 | 2026-08-31 | [himalayas](https://himalayas.app/companies/wpromote) |
| CACI International Inc | GLOBAL | 8 | 56 | 2026-09-18 | [himalayas](https://himalayas.app/companies/caci-international-inc) |
| Aptive | GLOBAL | 4 | 56 | 2026-09-17 | [himalayas](https://himalayas.app/companies/aptive) |
| Enroute | GLOBAL | 2 | 56 | 2026-09-10 | [himalayas](https://himalayas.app/companies/enroute) |
| Bounteous | GLOBAL | 1 | 56 | 2026-09-01 | [himalayas](https://himalayas.app/companies/bounteous) |
| Calibrate | GLOBAL | 1 | 56 | 2026-09-05 | [himalayas](https://himalayas.app/companies/calibrate) |
| InductiveHealth | GLOBAL | 1 | 56 | 2026-09-05 | [himalayas](https://himalayas.app/companies/inductivehealth) |
| Jabil | GLOBAL | 1 | 56 | 2026-09-08 | [himalayas](https://himalayas.app/companies/jabil) |
| Mano Lani LLC | GLOBAL | 1 | 56 | 2026-09-16 | [himalayas](https://himalayas.app/companies/mano-lani-llc) |
| Pavebank | GLOBAL | 1 | 56 | 2026-08-28 | [himalayas](https://himalayas.app/companies/pavebank) |
| SoSafe | GLOBAL | 1 | 56 | 2026-08-28 | [himalayas](https://himalayas.app/companies/sosafe) |
| Spoiler Alert | GLOBAL | 1 | 56 | 2026-09-16 | [himalayas](https://himalayas.app/companies/spoiler-alert) |
| TechInsights | GLOBAL | 1 | 56 | 2026-08-30 | [himalayas](https://himalayas.app/companies/techinsights) |
| Sezzle | GLOBAL | 7 | 55 | 2026-09-06 | [himalayas](https://himalayas.app/companies/sezzle) |
| Grupo Boticário | GLOBAL | 3 | 55 | 2026-09-05 | [himalayas](https://himalayas.app/companies/grupo-boticario) |
| Root, Inc. | GLOBAL | 3 | 55 | 2026-09-13 | [himalayas](https://himalayas.app/companies/joinroot) |
| 3Cloud | GLOBAL | 2 | 55 | 2026-09-18 | [himalayas](https://himalayas.app/companies/3cloud) |
| Cimpress/Vista | GLOBAL | 2 | 55 | 2026-09-07 | [himalayas](https://himalayas.app/companies/vistaprint) |
| College Board | GLOBAL | 2 | 55 | 2026-09-03 | [himalayas](https://himalayas.app/companies/college-board) |
| Danaher | GLOBAL | 2 | 55 | 2026-09-10 | [himalayas](https://himalayas.app/companies/danaher) |
| Guidehouse | GLOBAL | 2 | 55 | 2026-09-03 | [himalayas](https://himalayas.app/companies/guidehouse) |
| Sedgwick | GLOBAL | 2 | 55 | 2026-09-07 | [himalayas](https://himalayas.app/companies/sedgwick) |
| Alpaca | GLOBAL | 1 | 55 | 2026-09-15 | [himalayas](https://himalayas.app/companies/alpaca) |
| Booksy | GLOBAL | 1 | 55 | 2026-09-17 | [himalayas](https://himalayas.app/companies/booksy-net) |
| Conetic Group | GLOBAL | 1 | 55 | 2026-09-16 | [himalayas](https://himalayas.app/companies/conetic-group) |
| Elevated Hires | GLOBAL | 1 | 55 | 2026-09-12 | [himalayas](https://himalayas.app/companies/elevated-hires) |
| Gorilla Logic | GLOBAL | 1 | 55 | 2026-09-05 | [himalayas](https://himalayas.app/companies/gorilla-logic) |
| intive | GLOBAL | 1 | 55 | 2026-09-01 | [himalayas](https://himalayas.app/companies/intive) |
| Johns Hopkins University | GLOBAL | 1 | 55 | 2026-09-06 | [himalayas](https://himalayas.app/companies/johns-hopkins-university) |
| NinjaHoldings | GLOBAL | 1 | 55 | 2026-09-13 | [himalayas](https://himalayas.app/companies/ninjaholdings) |
| Remedy Product Studio | GLOBAL | 1 | 55 | 2026-09-14 | [himalayas](https://himalayas.app/companies/remedy-product-studio) |
| Softeta | GLOBAL | 1 | 55 | 2026-09-10 | [himalayas](https://himalayas.app/companies/softeta) |
| Zillow Group | GLOBAL | 1 | 55 | 2026-09-09 | [himalayas](https://himalayas.app/companies/zillow-group) |
| One More Child | GLOBAL | 5 | 54 | 2026-09-16 | [himalayas](https://himalayas.app/companies/one-more-child) |
| SHI International Corp. | GLOBAL | 4 | 54 | 2026-09-19 | [himalayas](https://himalayas.app/companies/shi-international-corp) |
| Datavail | GLOBAL | 3 | 54 | 2026-09-16 | [himalayas](https://himalayas.app/companies/datavail) |
| Leidos | GLOBAL | 3 | 54 | 2026-09-13 | [himalayas](https://himalayas.app/companies/leidos) |
| Overmind | GLOBAL | 3 | 54 | 2026-09-16 | [himalayas](https://himalayas.app/companies/overmind) |
| Capps | GLOBAL | 2 | 54 | 2026-09-05 | [himalayas](https://himalayas.app/companies/capps) |
| Envitia | GLOBAL | 2 | 54 | 2026-09-17 | [himalayas](https://himalayas.app/companies/envitia) |
| Molina Healthcare | GLOBAL | 2 | 54 | 2026-09-09 | [himalayas](https://himalayas.app/companies/molina-healthcare) |
| Pandoblox | GLOBAL | 2 | 54 | 2026-09-13 | [himalayas](https://himalayas.app/companies/pandoblox) |
| Gainwell Technologies | GLOBAL | 1 | 54 | 2026-09-04 | [himalayas](https://himalayas.app/companies/gainwell-technologies) |
| Inizio Partners Corp | GLOBAL | 1 | 54 | 2026-09-05 | [himalayas](https://himalayas.app/companies/inizio-partners-corp) |
| IntegriChain | GLOBAL | 1 | 54 | 2026-08-28 | [himalayas](https://himalayas.app/companies/integrichain) |
| Memorial Hermann Health System | GLOBAL | 1 | 54 | 2026-09-14 | [himalayas](https://himalayas.app/companies/memorial-hermann-health-system) |
| Modash OÜ | GLOBAL | 1 | 54 | 2026-09-10 | [himalayas](https://himalayas.app/companies/modash-ou) |
| Satellite Office | GLOBAL | 1 | 54 | 2026-09-05 | [himalayas](https://himalayas.app/companies/satellite-office) |
| Skylight | GLOBAL | 1 | 54 | 2026-09-14 | [himalayas](https://himalayas.app/companies/skylight) |
| Tires-Easy | GLOBAL | 1 | 54 | 2026-09-18 | [himalayas](https://himalayas.app/companies/tires-easy) |
| TLC Worldwide | GLOBAL | 1 | 54 | 2026-09-05 | [himalayas](https://himalayas.app/companies/tlc-worldwide) |
| Trilon Group | GLOBAL | 1 | 54 | 2026-09-14 | [himalayas](https://himalayas.app/companies/trilon-group) |
| Blend360 | GLOBAL | 6 | 53 | 2026-09-17 | [himalayas](https://himalayas.app/companies/blend360) |
| Empower | GLOBAL | 5 | 53 | 2026-09-13 | [himalayas](https://himalayas.app/companies/empower-com) |
| Stefanini | GLOBAL | 4 | 53 | 2026-09-19 | [himalayas](https://himalayas.app/companies/stefanini) |
| Bluelight Consulting | GLOBAL | 3 | 53 | 2026-09-07 | [himalayas](https://himalayas.app/companies/bluelight-consulting) |
| Bodwé Group | GLOBAL | 2 | 53 | 2026-09-03 | [himalayas](https://himalayas.app/companies/bodwe-group) |
| HubSpot | GLOBAL | 2 | 53 | 2026-09-06 | [himalayas](https://himalayas.app/companies/hubspot) |
| XTB | GLOBAL | 2 | 53 | 2026-09-16 | [himalayas](https://himalayas.app/companies/xtb) |
| Aflac | GLOBAL | 1 | 53 | 2026-08-30 | [himalayas](https://himalayas.app/companies/aflac) |
| Assent | GLOBAL | 1 | 53 | 2026-08-29 | [himalayas](https://himalayas.app/companies/assent) |
| BetterMe | GLOBAL | 1 | 53 | 2026-09-08 | [himalayas](https://himalayas.app/companies/betterme) |
| Cincinnati Financial | GLOBAL | 1 | 53 | 2026-09-13 | [himalayas](https://himalayas.app/companies/cincinnati-financial) |
| CME | GLOBAL | 1 | 53 | 2026-09-16 | [himalayas](https://himalayas.app/companies/cme) |
| Digital Career Institute | GLOBAL | 1 | 53 | 2026-09-04 | [himalayas](https://himalayas.app/companies/digital-career-institute) |
| FINTRX | GLOBAL | 1 | 53 | 2026-09-15 | [himalayas](https://himalayas.app/companies/fintrx) |
| Fusemachines | GLOBAL | 1 | 53 | 2026-09-12 | [himalayas](https://himalayas.app/companies/fusemachines) |
| Gopuff | GLOBAL | 1 | 53 | 2026-09-19 | [himalayas](https://himalayas.app/companies/gopuff) |
| HRM INFO LLC | GLOBAL | 1 | 53 | 2026-09-11 | [himalayas](https://himalayas.app/companies/hrm-info-llc) |
| LEAP Legal Software | GLOBAL | 1 | 53 | 2026-09-04 | [himalayas](https://himalayas.app/companies/leap-legal-software) |
| Med-Metrix | GLOBAL | 1 | 53 | 2026-09-19 | [himalayas](https://himalayas.app/companies/med-metrix) |
| Prominence Advisors | GLOBAL | 1 | 53 | 2026-09-06 | [himalayas](https://himalayas.app/companies/prominence-advisors) |
| Underwriters Laboratories Inc. | GLOBAL | 1 | 53 | 2026-09-16 | [himalayas](https://himalayas.app/companies/underwriters-laboratories-inc) |
| Centene Corporation | GLOBAL | 2 | 52 | 2026-09-16 | [himalayas](https://himalayas.app/companies/centene-corporation) |
| Globaldev Group | GLOBAL | 2 | 52 | 2026-09-08 | [himalayas](https://himalayas.app/companies/globaldev-group) |
| TTEC Digital | GLOBAL | 2 | 52 | 2026-09-07 | [himalayas](https://himalayas.app/companies/ttec-digital) |
| ABOUT YOU SE & Co. KG | GLOBAL | 1 | 52 | 2026-09-06 | [himalayas](https://himalayas.app/companies/about-you-se-co-kg) |
| Applied Systems | GLOBAL | 1 | 52 | 2026-09-07 | [himalayas](https://himalayas.app/companies/applied-systems) |
| Clover Health | GLOBAL | 1 | 52 | 2026-09-04 | [himalayas](https://himalayas.app/companies/clover-health) |
| Crisis Text Line, Inc. | GLOBAL | 1 | 52 | 2026-09-14 | [himalayas](https://himalayas.app/companies/crisis-text-line-inc) |
| Curology | GLOBAL | 1 | 52 | 2026-09-04 | [himalayas](https://himalayas.app/companies/curology) |
| DeepSource | GLOBAL | 1 | 52 | 2026-09-09 | [himalayas](https://himalayas.app/companies/deepsource-io) |
| EbizON | GLOBAL | 1 | 52 | 2026-09-14 | [himalayas](https://himalayas.app/companies/ebizon) |
| Fieldwire by Hilti | GLOBAL | 1 | 52 | 2026-09-03 | [himalayas](https://himalayas.app/companies/fieldwire-by-hilti) |
| Hamilton Lane | GLOBAL | 1 | 52 | 2026-09-06 | [himalayas](https://himalayas.app/companies/hamilton-lane) |
| Inetum | GLOBAL | 1 | 52 | 2026-09-11 | [himalayas](https://himalayas.app/companies/inetum) |
| JetBridge | GLOBAL | 1 | 52 | 2026-09-15 | [himalayas](https://himalayas.app/companies/jetbridge) |
| Medina Talent Group | GLOBAL | 1 | 52 | 2026-09-03 | [himalayas](https://himalayas.app/companies/medina-talent-group) |
| Newfire Global Partners | GLOBAL | 1 | 52 | 2026-09-04 | [himalayas](https://himalayas.app/companies/newfire-global-partners) |
| Redpin | GLOBAL | 1 | 52 | 2026-09-13 | [himalayas](https://himalayas.app/companies/redpin) |
| Ryder System, Inc. | GLOBAL | 1 | 52 | 2026-09-10 | [himalayas](https://himalayas.app/companies/ryder-system-inc) |
| The Good and the Beautiful | GLOBAL | 1 | 52 | 2026-09-06 | [himalayas](https://himalayas.app/companies/the-good-and-the-beautiful) |
| blueworks AG | GLOBAL | 4 | 51 | 2026-09-19 | [himalayas](https://himalayas.app/companies/blueworks-ag) |
| Colibri Digital | GLOBAL | 2 | 51 | 2026-09-05 | [himalayas](https://himalayas.app/companies/colibri-digital) |
| Hillenbrand | GLOBAL | 2 | 51 | 2026-09-07 | [himalayas](https://himalayas.app/companies/hillenbrand) |
| Calpine | GLOBAL | 1 | 51 | 2026-09-13 | [himalayas](https://himalayas.app/companies/calpine) |
| Clarify Health | GLOBAL | 1 | 51 | 2026-08-31 | [himalayas](https://himalayas.app/companies/clarify-health) |
| Dreamix Ltd. | GLOBAL | 1 | 51 | 2026-09-05 | [himalayas](https://himalayas.app/companies/dreamix-ltd) |
| Egen | GLOBAL | 1 | 51 | 2026-08-29 | [himalayas](https://himalayas.app/companies/egen-ai) |
| Evergreen Nephrology | GLOBAL | 1 | 51 | 2026-09-19 | [himalayas](https://himalayas.app/companies/evergreen-nephrology) |
| Evolve | GLOBAL | 1 | 51 | 2026-08-29 | [himalayas](https://himalayas.app/companies/evolve) |
| Motorola Solutions | GLOBAL | 1 | 51 | 2026-09-09 | [himalayas](https://himalayas.app/companies/motorola-solutions) |
| Netrix Global | GLOBAL | 1 | 51 | 2026-09-08 | [himalayas](https://himalayas.app/companies/netrix-global) |
| Softgic | GLOBAL | 1 | 51 | 2026-08-30 | [himalayas](https://himalayas.app/companies/softgic) |
| SteelSeries | GLOBAL | 1 | 51 | 2026-09-01 | [himalayas](https://himalayas.app/companies/steelseries) |
| Stryker | GLOBAL | 1 | 51 | 2026-09-08 | [himalayas](https://himalayas.app/companies/stryker) |
| Synera | GLOBAL | 1 | 51 | 2026-09-10 | [himalayas](https://himalayas.app/companies/synera) |
| Tiger Analytics | GLOBAL | 6 | 50 | 2026-09-19 | [himalayas](https://himalayas.app/companies/tiger-analytics) |
| Astrana Health | GLOBAL | 2 | 50 | 2026-09-10 | [himalayas](https://himalayas.app/companies/astrana-health) |
| Claritas Rx | GLOBAL | 2 | 50 | 2026-09-08 | [himalayas](https://himalayas.app/companies/claritas-rx) |
| D-ploy | GLOBAL | 1 | 50 | 2026-09-17 | [himalayas](https://himalayas.app/companies/d-ploy) |
| KPI Solutions | GLOBAL | 1 | 50 | 2026-09-04 | [himalayas](https://himalayas.app/companies/kpi-solutions) |
| Oddball | GLOBAL | 1 | 50 | 2026-09-06 | [himalayas](https://himalayas.app/companies/oddball) |
| Ookla | GLOBAL | 1 | 50 | 2026-08-31 | [himalayas](https://himalayas.app/companies/ookla) |
| OrderYOYO | GLOBAL | 1 | 50 | 2026-09-09 | [himalayas](https://himalayas.app/companies/orderyoyo) |
| Prometteur Solutions Pvt. Ltd. | GLOBAL | 1 | 50 | 2026-08-29 | [himalayas](https://himalayas.app/companies/prometteur-solutions-pvt-ltd) |
| RMI | GLOBAL | 1 | 50 | 2026-08-31 | [himalayas](https://himalayas.app/companies/rmi) |
| Syms Strategic Group, LLC (SSG) | GLOBAL | 1 | 50 | 2026-09-14 | [himalayas](https://himalayas.app/companies/syms-strategic-group-llc-ssg) |
| The Quality Group GmbH | GLOBAL | 1 | 50 | 2026-08-28 | [himalayas](https://himalayas.app/companies/the-quality-group-gmbh) |
| Valtech | GLOBAL | 1 | 50 | 2026-09-06 | [himalayas](https://himalayas.app/companies/valtech) |
| CI&T | GLOBAL | 9 | 49 | 2026-09-05 | [himalayas](https://himalayas.app/companies/ci-t) |
| Peraton | GLOBAL | 4 | 49 | 2026-09-18 | [himalayas](https://himalayas.app/companies/peraton) |
| HealthEdge | GLOBAL | 2 | 49 | 2026-09-17 | [himalayas](https://himalayas.app/companies/healthedge) |
| ProArch | GLOBAL | 2 | 49 | 2026-09-16 | [himalayas](https://himalayas.app/companies/proarch) |
| WATI | GLOBAL | 2 | 49 | 2026-09-19 | [himalayas](https://himalayas.app/companies/wati) |
| Concept Plus | GLOBAL | 1 | 49 | 2026-09-05 | [himalayas](https://himalayas.app/companies/concept-plus) |
| Fusion Consulting | GLOBAL | 1 | 49 | 2026-09-10 | [himalayas](https://himalayas.app/companies/fusion-consulting) |
| Irth | GLOBAL | 1 | 49 | 2026-09-13 | [himalayas](https://himalayas.app/companies/irth) |
| Magna Legal Services | GLOBAL | 1 | 49 | 2026-09-03 | [himalayas](https://himalayas.app/companies/magna-legal-services) |
| Manpower Malta | GLOBAL | 1 | 49 | 2026-09-04 | [himalayas](https://himalayas.app/companies/manpower-malta) |
| Nexplay Consulting Inc. | GLOBAL | 1 | 49 | 2026-09-08 | [himalayas](https://himalayas.app/companies/nexplay-consulting-inc) |
| Outforce | GLOBAL | 1 | 49 | 2026-09-16 | [himalayas](https://himalayas.app/companies/outforce-com) |
| Penn Interactive | GLOBAL | 1 | 49 | 2026-09-04 | [himalayas](https://himalayas.app/companies/penn-interactive) |
| Redstone Federal Credit Union | GLOBAL | 1 | 49 | 2026-09-07 | [himalayas](https://himalayas.app/companies/redstone-federal-credit-union) |
| Sequoia Connect | GLOBAL | 1 | 49 | 2026-09-14 | [himalayas](https://himalayas.app/companies/sequoia-connect) |
| Sparq | GLOBAL | 1 | 49 | 2026-09-04 | [himalayas](https://himalayas.app/companies/sparq) |
| Stord | GLOBAL | 1 | 49 | 2026-08-31 | [himalayas](https://himalayas.app/companies/stord) |
| Xideral | GLOBAL | 1 | 49 | 2026-09-03 | [himalayas](https://himalayas.app/companies/xideral) |
| Power Digital Marketing | GLOBAL | 6 | 48 | 2026-09-03 | [himalayas](https://himalayas.app/companies/power-digital-marketing) |
| Alignment Health | GLOBAL | 1 | 48 | 2026-09-13 | [himalayas](https://himalayas.app/companies/alignment-health) |
| Arch Capital Group Ltd. | GLOBAL | 1 | 48 | 2026-09-15 | [himalayas](https://himalayas.app/companies/arch-capital-group-ltd) |
| Buyers Edge Platform | GLOBAL | 1 | 48 | 2026-08-31 | [himalayas](https://himalayas.app/companies/buyers-edge-platform) |
| DecisionPoint Corporation | GLOBAL | 1 | 48 | 2026-09-04 | [himalayas](https://himalayas.app/companies/decisionpoint-corporation) |
| Expedock | GLOBAL | 1 | 48 | 2026-09-03 | [himalayas](https://himalayas.app/companies/expedock) |
| Logicalis Spain | GLOBAL | 1 | 48 | 2026-09-18 | [himalayas](https://himalayas.app/companies/logicalis-com) |
| Lyfegen | GLOBAL | 1 | 48 | 2026-09-06 | [himalayas](https://himalayas.app/companies/lyfegen) |
| Lyric, Inc. | GLOBAL | 1 | 48 | 2026-09-05 | [himalayas](https://himalayas.app/companies/lyric-inc) |
| Mercy | GLOBAL | 1 | 48 | 2026-09-01 | [himalayas](https://himalayas.app/companies/mercy) |
| Mindrift | GLOBAL | 1 | 48 | 2026-09-07 | [himalayas](https://himalayas.app/companies/mindrift) |
| Mutual Of Omaha | GLOBAL | 1 | 48 | 2026-09-05 | [himalayas](https://himalayas.app/companies/mutual-of-omaha) |
| OneMagnify | GLOBAL | 1 | 48 | 2026-08-30 | [himalayas](https://himalayas.app/companies/onemagnify) |
| shopware AG | GLOBAL | 1 | 48 | 2026-09-06 | [himalayas](https://himalayas.app/companies/shopware-ag) |
| ZoomInfo | GLOBAL | 1 | 48 | 2026-08-28 | [himalayas](https://himalayas.app/companies/zoominfo) |
| NielsenIQ | GLOBAL | 2 | 47 | 2026-09-18 | [himalayas](https://himalayas.app/companies/nielseniq) |
| Amgen | GLOBAL | 1 | 47 | 2026-09-14 | [himalayas](https://himalayas.app/companies/amgen) |
| Blue Water Thinking | GLOBAL | 1 | 47 | 2026-09-18 | [himalayas](https://himalayas.app/companies/blue-water-thinking) |
| Cast & Crew | GLOBAL | 1 | 47 | 2026-09-14 | [himalayas](https://himalayas.app/companies/cast-crew) |
| CenturyLink | GLOBAL | 1 | 47 | 2026-09-13 | [himalayas](https://himalayas.app/companies/centurylink) |
| CompanyCam | GLOBAL | 1 | 47 | 2026-09-03 | [himalayas](https://himalayas.app/companies/companycam) |
| Fox Point Recruitment LLC | GLOBAL | 1 | 47 | 2026-09-15 | [himalayas](https://himalayas.app/companies/fox-point-recruitment-llc) |
| Grupo SysMap | GLOBAL | 1 | 47 | 2026-09-10 | [himalayas](https://himalayas.app/companies/grupo-sysmap) |
| NPS Prism | GLOBAL | 1 | 47 | 2026-09-16 | [himalayas](https://himalayas.app/companies/nps-prism) |
| Overstory | GLOBAL | 1 | 47 | 2026-09-18 | [himalayas](https://himalayas.app/companies/overstory) |
| Prenuvo | GLOBAL | 1 | 47 | 2026-09-14 | [himalayas](https://himalayas.app/companies/prenuvo) |
| EXL | GLOBAL | 7 | 46 | 2026-09-16 | [himalayas](https://himalayas.app/companies/exl) |
| Parexel | GLOBAL | 6 | 46 | 2026-09-15 | [himalayas](https://himalayas.app/companies/parexel) |
| Particle41 | GLOBAL | 4 | 46 | 2026-09-19 | [himalayas](https://himalayas.app/companies/particle41) |
| Precision Medicine Group | GLOBAL | 4 | 46 | 2026-09-09 | [himalayas](https://himalayas.app/companies/precision-medicine-group) |
| Mozilla | GLOBAL | 2 | 46 | 2026-09-11 | [himalayas](https://himalayas.app/companies/mozilla) |
| Flexstaf IT | GLOBAL | 1 | 46 | 2026-08-31 | [himalayas](https://himalayas.app/companies/flexstaf-it) |
| Independence Pet Group | GLOBAL | 1 | 46 | 2026-09-06 | [himalayas](https://himalayas.app/companies/independence-pet-group) |
| Precision AQ | GLOBAL | 1 | 46 | 2026-08-30 | [himalayas](https://himalayas.app/companies/precision-aq) |
| Republic Services | GLOBAL | 1 | 46 | 2026-09-13 | [himalayas](https://himalayas.app/companies/republic-services) |
| EWOR GmbH | GLOBAL | 10 | 45 | 2026-09-15 | [himalayas](https://himalayas.app/companies/ewor-gmbh) |
| Euromonitor | GLOBAL | 8 | 45 | 2026-09-08 | [himalayas](https://himalayas.app/companies/euromonitor) |
| First Advantage | GLOBAL | 3 | 45 | 2026-08-31 | [himalayas](https://himalayas.app/companies/first-advantage) |
| Precision for Medicine | GLOBAL | 3 | 45 | 2026-09-09 | [himalayas](https://himalayas.app/companies/precision-for-medicine) |
| ResMed | GLOBAL | 2 | 45 | 2026-09-10 | [himalayas](https://himalayas.app/companies/resmed) |
| Aircall | GLOBAL | 1 | 45 | 2026-09-06 | [himalayas](https://himalayas.app/companies/aircall) |
| Avantor | GLOBAL | 1 | 45 | 2026-09-07 | [himalayas](https://himalayas.app/companies/avantor) |
| Castellum | GLOBAL | 1 | 45 | 2026-09-03 | [himalayas](https://himalayas.app/companies/castellum) |
| Core BTS | GLOBAL | 1 | 45 | 2026-08-30 | [himalayas](https://himalayas.app/companies/core-bts) |
| Dynata | GLOBAL | 1 | 45 | 2026-09-05 | [himalayas](https://himalayas.app/companies/dynata) |
| Growth Acceleration Partners | GLOBAL | 1 | 45 | 2026-09-05 | [himalayas](https://himalayas.app/companies/wearegap) |
| HomeServices of America | GLOBAL | 1 | 45 | 2026-09-14 | [himalayas](https://himalayas.app/companies/homeservices-of-america) |
| i2G Systems | GLOBAL | 1 | 45 | 2026-09-17 | [himalayas](https://himalayas.app/companies/i2g-systems) |
| JerseySTEM | GLOBAL | 1 | 45 | 2026-09-03 | [himalayas](https://himalayas.app/companies/jerseystem) |
| Nebius | GLOBAL | 1 | 45 | 2026-09-06 | [himalayas](https://himalayas.app/companies/nebius) |
| NextGen Healthcare | GLOBAL | 1 | 45 | 2026-09-01 | [himalayas](https://himalayas.app/companies/nextgen-healthcare) |
| Perceptive | GLOBAL | 1 | 45 | 2026-08-28 | [himalayas](https://himalayas.app/companies/perceptive) |
| Pie Insurance | GLOBAL | 1 | 45 | 2026-09-07 | [himalayas](https://himalayas.app/companies/pie-insurance) |
| PM Consulting | GLOBAL | 1 | 45 | 2026-09-10 | [himalayas](https://himalayas.app/companies/pm-consulting) |
| Reface | GLOBAL | 1 | 45 | 2026-09-10 | [himalayas](https://himalayas.app/companies/reface-ai) |
| Robots & Pencils | GLOBAL | 1 | 45 | 2026-08-31 | [himalayas](https://himalayas.app/companies/robots-pencils) |
| Thrive Global | GLOBAL | 1 | 45 | 2026-08-31 | [himalayas](https://himalayas.app/companies/thrive-global) |
| Value1 | GLOBAL | 1 | 45 | 2026-09-11 | [himalayas](https://himalayas.app/companies/value1) |
| West 4th Strategy | GLOBAL | 1 | 45 | 2026-09-17 | [himalayas](https://himalayas.app/companies/west-4th-strategy) |
| ARKHO | GLOBAL | 2 | 44 | 2026-09-14 | [himalayas](https://himalayas.app/companies/arkho) |
| ACCUFILE, INC. | GLOBAL | 1 | 44 | 2026-08-31 | [himalayas](https://himalayas.app/companies/accufile-inc) |
| BDR Solutions, LLC | GLOBAL | 1 | 44 | 2026-09-15 | [himalayas](https://himalayas.app/companies/bdr-solutions-llc) |
| Clario | GLOBAL | 1 | 44 | 2026-09-09 | [himalayas](https://himalayas.app/companies/clario) |
| Clearwave Corporation | GLOBAL | 1 | 44 | 2026-09-05 | [himalayas](https://himalayas.app/companies/clearwaveinc) |
| Ensemble Health Partners | GLOBAL | 1 | 44 | 2026-09-17 | [himalayas](https://himalayas.app/companies/ensemble-health-partners) |
| Keebler Health | GLOBAL | 1 | 44 | 2026-09-05 | [himalayas](https://himalayas.app/companies/keebler-health) |
| Maropost | GLOBAL | 1 | 44 | 2026-09-06 | [himalayas](https://himalayas.app/companies/maropost) |
| MyFitnessPal | GLOBAL | 1 | 44 | 2026-09-13 | [himalayas](https://himalayas.app/companies/myfitnesspal) |
| Sonatype | GLOBAL | 1 | 44 | 2026-09-04 | [himalayas](https://himalayas.app/companies/sonatype) |
| VillageMD | GLOBAL | 1 | 44 | 2026-09-05 | [himalayas](https://himalayas.app/companies/villagemd) |
| virtual7 GmbH | GLOBAL | 1 | 44 | 2026-09-09 | [himalayas](https://himalayas.app/companies/virtual7-gmbh) |
| Moniepoint | GLOBAL | 4 | 43 | 2026-09-09 | [himalayas](https://himalayas.app/companies/moniepoint) |
| The Cigna Group | GLOBAL | 2 | 43 | 2026-09-10 | [himalayas](https://himalayas.app/companies/the-cigna-group) |
| Arvig | GLOBAL | 1 | 43 | 2026-08-31 | [himalayas](https://himalayas.app/companies/arvig) |
| Bright Horizons | GLOBAL | 1 | 43 | 2026-08-31 | [himalayas](https://himalayas.app/companies/bright-horizons) |
| Concurrent Technologies Corporation | GLOBAL | 1 | 43 | 2026-09-10 | [himalayas](https://himalayas.app/companies/concurrent-technologies-corporation) |
| Grant Street Group | GLOBAL | 1 | 43 | 2026-09-10 | [himalayas](https://himalayas.app/companies/grant-street-group) |
| hireworks | GLOBAL | 1 | 43 | 2026-09-03 | [himalayas](https://himalayas.app/companies/hireworks) |
| Jampp | GLOBAL | 1 | 43 | 2026-09-06 | [himalayas](https://himalayas.app/companies/jampp) |
| Triangle Cyber | GLOBAL | 1 | 43 | 2026-09-05 | [himalayas](https://himalayas.app/companies/triangle-cyber) |
| Verisma | GLOBAL | 1 | 43 | 2026-09-13 | [himalayas](https://himalayas.app/companies/verisma) |
| Aqua Finance | GLOBAL | 1 | 42 | 2026-09-05 | [himalayas](https://himalayas.app/companies/aqua-finance) |
| Crowdstrike | GLOBAL | 1 | 42 | 2026-09-13 | [himalayas](https://himalayas.app/companies/crowdstrike) |
| Fi | GLOBAL | 1 | 42 | 2026-09-09 | [himalayas](https://himalayas.app/companies/fi) |
| Hypersonix | GLOBAL | 1 | 42 | 2026-09-06 | [himalayas](https://himalayas.app/companies/hypersonix) |
| JBHired | GLOBAL | 1 | 42 | 2026-09-11 | [himalayas](https://himalayas.app/companies/jbhired) |
| Movable Ink | GLOBAL | 1 | 42 | 2026-09-18 | [himalayas](https://himalayas.app/companies/movable-ink) |
| Ritchie Bros. | GLOBAL | 1 | 42 | 2026-09-15 | [himalayas](https://himalayas.app/companies/ritchie-bros) |
| Sales Consulting | GLOBAL | 1 | 42 | 2026-09-06 | [himalayas](https://himalayas.app/companies/sales-consulting) |
| SolutionHealth | GLOBAL | 1 | 42 | 2026-09-07 | [himalayas](https://himalayas.app/companies/solutionhealth) |
| Strategic Systems International | GLOBAL | 1 | 42 | 2026-09-08 | [himalayas](https://himalayas.app/companies/strategic-systems-international) |
| SunStrong Management, LLC | GLOBAL | 1 | 42 | 2026-09-11 | [himalayas](https://himalayas.app/companies/sunstrong-management-llc) |
| Unit8 SA | GLOBAL | 1 | 42 | 2026-09-16 | [himalayas](https://himalayas.app/companies/unit8-sa) |
| Walker & Dunlop | GLOBAL | 1 | 42 | 2026-09-09 | [himalayas](https://himalayas.app/companies/walker-dunlop) |
| Canonical | GLOBAL | 3 | 41 | 2026-09-19 | [himalayas](https://himalayas.app/companies/canonical) |
| GE Aerospace | GLOBAL | 2 | 41 | 2026-09-18 | [himalayas](https://himalayas.app/companies/ge-aerospace) |
| Datavant | GLOBAL | 1 | 41 | 2026-09-18 | [himalayas](https://himalayas.app/companies/datavant) |
| Doordash | GLOBAL | 1 | 41 | 2026-09-04 | [himalayas](https://himalayas.app/companies/doordash) |
| Full Sail University | GLOBAL | 1 | 41 | 2026-09-14 | [himalayas](https://himalayas.app/companies/full-sail-university) |
| Guild Mortgage | GLOBAL | 1 | 41 | 2026-08-29 | [himalayas](https://himalayas.app/companies/guild-mortgage) |
| Interior Logic Group | GLOBAL | 1 | 41 | 2026-09-18 | [himalayas](https://himalayas.app/companies/interior-logic-group) |
| Pinterest | GLOBAL | 1 | 41 | 2026-08-29 | [himalayas](https://himalayas.app/companies/pinterestcareers) |
| Sun King | GLOBAL | 1 | 41 | 2026-09-04 | [himalayas](https://himalayas.app/companies/sun-king) |
| Verdantas | GLOBAL | 1 | 41 | 2026-09-03 | [himalayas](https://himalayas.app/companies/verdantas) |
| Bold Orange | GLOBAL | 1 | 40 | 2026-09-14 | [himalayas](https://himalayas.app/companies/bold-orange) |
| CareTalk Health | GLOBAL | 1 | 40 | 2026-09-19 | [himalayas](https://himalayas.app/companies/caretalk-health) |
| Daniel J Edelman Holdings | GLOBAL | 1 | 40 | 2026-09-03 | [himalayas](https://himalayas.app/companies/daniel-j-edelman-holdings) |
| Deutsche Telekom IT Solutions Slovakia | GLOBAL | 1 | 40 | 2026-08-31 | [himalayas](https://himalayas.app/companies/deutsche-telekom-it-solutions-slovakia) |
| Harbor Compliance | GLOBAL | 1 | 40 | 2026-08-31 | [himalayas](https://himalayas.app/companies/harbor-compliance) |
| Highmark Health | GLOBAL | 1 | 40 | 2026-09-03 | [himalayas](https://himalayas.app/companies/highmark-health) |
| ImagineX | GLOBAL | 1 | 40 | 2026-09-10 | [himalayas](https://himalayas.app/companies/imaginex) |
| MGM Resorts International | GLOBAL | 1 | 40 | 2026-09-18 | [himalayas](https://himalayas.app/companies/mgm-resorts-international) |
| Redhorse | GLOBAL | 1 | 40 | 2026-09-18 | [himalayas](https://himalayas.app/companies/redhorse) |
| Southern Illinois Healthcare | GLOBAL | 1 | 40 | 2026-09-13 | [himalayas](https://himalayas.app/companies/southern-illinois-healthcare) |
| Trinity Life Sciences | GLOBAL | 1 | 40 | 2026-09-03 | [himalayas](https://himalayas.app/companies/trinity-life-sciences) |
| Vericast | GLOBAL | 1 | 40 | 2026-08-30 | [himalayas](https://himalayas.app/companies/vericast) |
| Bryant Park Consulting | GLOBAL | 1 | 39 | 2026-08-28 | [himalayas](https://himalayas.app/companies/bryant-park-consulting) |
| CareSource | GLOBAL | 1 | 39 | 2026-09-05 | [himalayas](https://himalayas.app/companies/caresource) |
| DTN | GLOBAL | 1 | 39 | 2026-09-09 | [himalayas](https://himalayas.app/companies/dtn) |
| Human Interest | GLOBAL | 1 | 39 | 2026-09-11 | [himalayas](https://himalayas.app/companies/human-interest) |
| i4DM | GLOBAL | 1 | 39 | 2026-08-29 | [himalayas](https://himalayas.app/companies/i4dm) |
| KKCompany Technologies | GLOBAL | 1 | 39 | 2026-09-05 | [himalayas](https://himalayas.app/companies/kkcompany-technologies) |
| Symetra | GLOBAL | 1 | 39 | 2026-09-10 | [himalayas](https://himalayas.app/companies/symetra) |
| Workiva | GLOBAL | 1 | 39 | 2026-08-31 | [himalayas](https://himalayas.app/companies/workiva) |
| TELUS Digital | GLOBAL | 5 | 38 | 2026-09-14 | [himalayas](https://himalayas.app/companies/telus-digital) |
| Attain Partners | GLOBAL | 1 | 38 | 2026-08-29 | [himalayas](https://himalayas.app/companies/attain-partners) |
| Factored | GLOBAL | 1 | 38 | 2026-09-17 | [himalayas](https://himalayas.app/companies/factored) |
| K2 Integrity | GLOBAL | 1 | 38 | 2026-09-03 | [himalayas](https://himalayas.app/companies/k2-integrity) |
| Management Science Associates, Inc. | GLOBAL | 1 | 38 | 2026-09-19 | [himalayas](https://himalayas.app/companies/management-science-associates-inc) |
| Providence | GLOBAL | 1 | 38 | 2026-09-15 | [himalayas](https://himalayas.app/companies/providence) |
| CorroHealth | GLOBAL | 1 | 37 | 2026-09-13 | [himalayas](https://himalayas.app/companies/corrohealth) |
| Monnoyeur | GLOBAL | 1 | 37 | 2026-09-13 | [himalayas](https://himalayas.app/companies/monnoyeur) |
| Nearshore Business Solutions | GLOBAL | 1 | 37 | 2026-09-06 | [himalayas](https://himalayas.app/companies/nearshore-business-solutions) |
| University of Maryland Global Campus | GLOBAL | 1 | 37 | 2026-09-14 | [himalayas](https://himalayas.app/companies/university-of-maryland-global-campus) |
| Dexcom | GLOBAL | 1 | 36 | 2026-09-06 | [himalayas](https://himalayas.app/companies/dexcom) |
| Genesys | GLOBAL | 1 | 36 | 2026-09-09 | [himalayas](https://himalayas.app/companies/genesys) |
| Scicom Infrastructure Services, Inc. | GLOBAL | 1 | 36 | 2026-09-18 | [himalayas](https://himalayas.app/companies/scicom-infrastructure-services-inc) |
| SGS | GLOBAL | 1 | 36 | 2026-09-07 | [himalayas](https://himalayas.app/companies/sgs) |
| AccelOne | GLOBAL | 1 | 35 | 2026-09-01 | [himalayas](https://himalayas.app/companies/accelone) |
| Analytica | GLOBAL | 1 | 35 | 2026-09-14 | [himalayas](https://himalayas.app/companies/analytica) |
| Kard | GLOBAL | 1 | 35 | 2026-09-06 | [himalayas](https://himalayas.app/companies/kard) |
| NirYu | GLOBAL | 1 | 35 | 2026-09-13 | [himalayas](https://himalayas.app/companies/niryu) |
| Spokeo | GLOBAL | 1 | 35 | 2026-08-28 | [himalayas](https://himalayas.app/companies/spokeo) |
| Syneos Health India Private Limited | GLOBAL | 1 | 35 | 2026-09-17 | [himalayas](https://himalayas.app/companies/syneos-health-india-private-limited) |
| Zoi | GLOBAL | 1 | 35 | 2026-08-29 | [himalayas](https://himalayas.app/companies/zoi) |
| Databricks | GLOBAL | 6 | 33 | 2026-09-18 | [himalayas](https://himalayas.app/companies/databricks) |
| Jobs for Humanity | GLOBAL | 2 | 33 | 2026-09-18 | [himalayas](https://himalayas.app/companies/jobs-for-humanity) |
| Deep DSG | GLOBAL | 1 | 33 | 2026-09-18 | [himalayas](https://himalayas.app/companies/deep-dsg) |
| Sparteo | GLOBAL | 1 | 33 | 2026-09-19 | [himalayas](https://himalayas.app/companies/sparteo-com) |
| Manifest | GLOBAL | 1 | 32 | 2026-09-10 | [himalayas](https://himalayas.app/companies/manifest) |
| Tivity Health | GLOBAL | 1 | 32 | 2026-09-17 | [himalayas](https://himalayas.app/companies/tivity-health) |
| M3 USA | GLOBAL | 2 | 31 | 2026-09-06 | [himalayas](https://himalayas.app/companies/m3-com) |
| Dhaka Technologies Limited Company | GLOBAL | 1 | 31 | 2026-09-19 | [himalayas](https://himalayas.app/companies/dhaka-technologies-limited-company) |
| FinStrat Management | GLOBAL | 1 | 31 | 2026-09-08 | [himalayas](https://himalayas.app/companies/finstrat-management) |
| Noack Statistik GmbH | GLOBAL | 1 | 31 | 2026-09-17 | [himalayas](https://himalayas.app/companies/noack-statistik-gmbh) |
| TELUS International AI Inc | GLOBAL | 2 | 30 | 2026-09-08 | [himalayas](https://himalayas.app/companies/telus-international-ai-inc) |
| Acosta Group | GLOBAL | 1 | 30 | 2026-09-04 | [himalayas](https://himalayas.app/companies/acosta-group) |
| Altais Health Solutions | GLOBAL | 1 | 30 | 2026-08-30 | [himalayas](https://himalayas.app/companies/altais-health-solutions) |
| Insight Enterprises, Inc. | GLOBAL | 1 | 30 | 2026-09-04 | [himalayas](https://himalayas.app/companies/insight-enterprises-inc) |
| karriere tutor GmbH | GLOBAL | 1 | 30 | 2026-09-05 | [himalayas](https://himalayas.app/companies/karriere-tutor-gmbh) |
| Keyloop | GLOBAL | 1 | 30 | 2026-09-18 | [himalayas](https://himalayas.app/companies/keyloop) |
| Kodiak Solutions | GLOBAL | 1 | 30 | 2026-08-31 | [himalayas](https://himalayas.app/companies/kodiak-solutions) |
| PowerData Group Consulting | GLOBAL | 1 | 30 | 2026-09-06 | [himalayas](https://himalayas.app/companies/powerdata-group-consulting) |
| Qualysoft | GLOBAL | 1 | 30 | 2026-09-10 | [himalayas](https://himalayas.app/companies/qualysoft) |
| Walter Bacon, LLC | GLOBAL | 1 | 30 | 2026-08-28 | [himalayas](https://himalayas.app/companies/walter-bacon-llc) |
| BHG Financial | GLOBAL | 1 | 29 | 2026-09-18 | [himalayas](https://himalayas.app/companies/bhg-financial) |
| Centrilogic | GLOBAL | 1 | 29 | 2026-09-06 | [himalayas](https://himalayas.app/companies/centrilogic) |
| Flatgigs | GLOBAL | 1 | 29 | 2026-08-29 | [himalayas](https://himalayas.app/companies/flatgigs) |
| Smarsh | GLOBAL | 1 | 29 | 2026-09-19 | [himalayas](https://himalayas.app/companies/smarsh) |
| University of Rochester | GLOBAL | 1 | 28 | 2026-09-05 | [himalayas](https://himalayas.app/companies/university-of-rochester) |
| Metabase | GLOBAL | 3 | 27 | 2026-09-16 | [himalayas](https://himalayas.app/companies/metabase) |
| Cloudera | GLOBAL | 1 | 27 | 2026-09-14 | [himalayas](https://himalayas.app/companies/cloudera) |
| Compass Group USA | GLOBAL | 1 | 27 | 2026-09-13 | [himalayas](https://himalayas.app/companies/compass-group-usa) |
| Woolpert | GLOBAL | 1 | 27 | 2026-09-03 | [himalayas](https://himalayas.app/companies/woolpert) |
| Qellus, LLC | GLOBAL | 1 | 26 | 2026-09-13 | [himalayas](https://himalayas.app/companies/qellus-llc) |
| Seeq | GLOBAL | 1 | 26 | 2026-09-17 | [himalayas](https://himalayas.app/companies/seeq) |
| Addepto | GLOBAL | 3 | 25 | 2026-09-19 | [himalayas](https://himalayas.app/companies/addepto) |
| Wesco | GLOBAL | 3 | 25 | 2026-09-14 | [himalayas](https://himalayas.app/companies/wesco) |
| CSI | GLOBAL | 1 | 25 | 2026-09-05 | [himalayas](https://himalayas.app/companies/csi) |
| Premier Inc. | GLOBAL | 1 | 25 | 2026-09-13 | [himalayas](https://himalayas.app/companies/premier-inc) |
| Press Ganey | GLOBAL | 1 | 25 | 2026-09-17 | [himalayas](https://himalayas.app/companies/press-ganey) |
| Vesta Software Group | GLOBAL | 1 | 25 | 2026-09-09 | [himalayas](https://himalayas.app/companies/vesta-software-group) |
| Xcellent Technology Solutions | GLOBAL | 1 | 25 | 2026-08-31 | [himalayas](https://himalayas.app/companies/xcellent-technology-solutions) |
| Circular Action Alliance | GLOBAL | 2 | 24 | 2026-09-14 | [himalayas](https://himalayas.app/companies/circular-action-alliance) |
| Cushman & Wakefield | GLOBAL | 1 | 24 | 2026-09-01 | [himalayas](https://himalayas.app/companies/cushman-wakefield) |
| ProSidian Consulting, LLC | GLOBAL | 1 | 23 | 2026-09-18 | [himalayas](https://himalayas.app/companies/prosidian-consulting-llc) |
| Sciens Building Solutions | GLOBAL | 1 | 23 | 2026-09-19 | [himalayas](https://himalayas.app/companies/sciens-building-solutions) |
| ICF | GLOBAL | 1 | 22 | 2026-09-17 | [himalayas](https://himalayas.app/companies/icf) |
| Jackpot.com | GLOBAL | 1 | 22 | 2026-08-28 | [himalayas](https://himalayas.app/companies/jackpot-com) |
| BI2run GmbH & Co. KG | GLOBAL | 2 | 21 | 2026-09-13 | [himalayas](https://himalayas.app/companies/bi2run-gmbh-co-kg) |
| Acosta | GLOBAL | 1 | 21 | 2026-09-04 | [himalayas](https://himalayas.app/companies/acosta) |
| Capital Technology Group | GLOBAL | 2 | 20 | 2026-09-18 | [himalayas](https://himalayas.app/companies/capital-technology-group) |
| SD Solutions | GLOBAL | 1 | 20 | 2026-09-08 | [himalayas](https://himalayas.app/companies/sd-solutions) |
| Altimate.ai | GLOBAL | 1 | 19 | 2026-09-02 | [himalayas](https://himalayas.app/companies/altimate-ai) |
| O-I | GLOBAL | 1 | 19 | 2026-09-18 | [himalayas](https://himalayas.app/companies/o-i) |
| Grace Hill | GLOBAL | 1 | 18 | 2026-08-31 | [himalayas](https://himalayas.app/companies/grace-hill) |
| Invoice Cloud | GLOBAL | 1 | 18 | 2026-08-29 | [himalayas](https://himalayas.app/companies/invoice-cloud) |
| Jonas Software UK & Europe | GLOBAL | 1 | 18 | 2026-09-18 | [himalayas](https://himalayas.app/companies/jonas-software-uk-europe) |
| Windhoff Group | GLOBAL | 1 | 18 | 2026-08-31 | [himalayas](https://himalayas.app/companies/windhoff-group) |
| Cowlar Design Studio | GLOBAL | 1 | 17 | 2026-09-11 | [himalayas](https://himalayas.app/companies/cowlar-design-studio) |
| CDW | GLOBAL | 1 | 16 | 2026-09-03 | [himalayas](https://himalayas.app/companies/cdw) |
| Hydrosat | GLOBAL | 2 | 15 | 2026-09-13 | [himalayas](https://himalayas.app/companies/hydrosat) |
| Geisinger | GLOBAL | 1 | 15 | 2026-09-03 | [himalayas](https://himalayas.app/companies/geisinger) |
| Hike2 | GLOBAL | 1 | 15 | 2026-09-03 | [himalayas](https://himalayas.app/companies/hike2) |
| Horace Mann | GLOBAL | 1 | 15 | 2026-09-16 | [himalayas](https://himalayas.app/companies/horace-mann) |
| Lyra Health | GLOBAL | 1 | 15 | 2026-09-19 | [himalayas](https://himalayas.app/companies/lyra-health) |
| Magpie Health Analytics | GLOBAL | 1 | 15 | 2026-09-08 | [himalayas](https://himalayas.app/companies/magpie-health-analytics) |
| Obsidian Security | GLOBAL | 1 | 15 | 2026-09-15 | [himalayas](https://himalayas.app/companies/obsidian-security) |
| TraceAir Technologies | GLOBAL | 2 | 14 | 2026-09-03 | [himalayas](https://himalayas.app/companies/traceair-technologies) |
| Acxiom | GLOBAL | 1 | 13 | 2026-08-29 | [himalayas](https://himalayas.app/companies/acxiom) |
| Consumer Edge | GLOBAL | 1 | 13 | 2026-09-01 | [himalayas](https://himalayas.app/companies/consumer-edge) |
| Customertimes | GLOBAL | 1 | 13 | 2026-09-06 | [himalayas](https://himalayas.app/companies/customertimes) |
| Fivetran | GLOBAL | 1 | 12 | 2026-09-05 | [himalayas](https://himalayas.app/companies/fivetran) |
| Skyward Specialty Insurance | GLOBAL | 1 | 12 | 2026-09-06 | [himalayas](https://himalayas.app/companies/skyward-specialty-insurance) |
| CoorB | GLOBAL | 3 | 10 | 2026-09-17 | [himalayas](https://himalayas.app/companies/coorb) |
| NVIDIA | GLOBAL | 1 | 10 | 2026-09-01 | [himalayas](https://himalayas.app/companies/nvidia) |
| Domo Inovação | GLOBAL | 1 | 8 | 2026-09-19 | [himalayas](https://himalayas.app/companies/domo-inovacao) |
| Stripe | GLOBAL | 1 | 5 | 2026-08-31 | [himalayas](https://himalayas.app/companies/stripe) |
| Salesforce | GLOBAL | 1 | 2 | 2026-09-13 | [himalayas](https://himalayas.app/companies/salesforce) |
| #twiceasnice Recruiting | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/twiceasnice-recruiting) |
| 3M Consultancy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/3m-consultancy) |
| 5 Star Global Recruitment Partners | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/5-star-global-recruitment-partners) |
| 540 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/540) |
| A3Data | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/a3data) |
| AB InBev | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ab-inbev) |
| Abacus Insights | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/abacus-insights) |
| AbbVie | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/abbvie) |
| Academic Partnerships | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/academic-partnerships) |
| Accelerant | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/accelerant) |
| Accenture | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/accenture) |
| Accesa & RaRo | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/accesa-raro) |
| Accordant Company | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/accordant-company) |
| Accorded | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/accorded) |
| Actian | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/actian) |
| ActivTrak | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/activtrak) |
| Advocate Aurora Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/advocate-aurora-health) |
| Afina | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/afina) |
| agileDSS | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/agiledss) |
| Agilent Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/agilent-technologies) |
| AgSource | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/agsource) |
| AIDA Recruitment | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/aida-recruitment) |
| Alarm Communications Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/uk) |
| All Generation Tech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/all-generation-tech) |
| All Native Shared Services Company | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/all-native-shared-services-company) |
| AllCloud | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/allcloud) |
| AlphaHire | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/alphahire) |
| Alternative Path Private Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/alternative-path-private-limited) |
| alx_africa | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/alx_africa) |
| AmeriLife | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/amerilife) |
| AmerisourceBergen | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/amerisourcebergen) |
| Ample Insight Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ample-insight-inc) |
| ANGEHEUERT GmbH Personalberatung | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/angeheuert-gmbh-personalberatung) |
| Animoca Brands | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/animoca-brands) |
| Anteriad | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/anteriad) |
| Aperia Technologies, Inc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/aperia-technologies-inc) |
| Applaudo Studios | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/applaudo-studios) |
| Applied Computing | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/applied-computing) |
| Aptus Data Labs | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/aptus-data-labs) |
| Arch Global Services (Philippines) Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/agsi) |
| Architecture in Motion | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/architecture-in-motion) |
| Argano | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/argano) |
| ARNVIND GROUP | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/arnvind-group) |
| Arrise | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/arrise) |
| ARSENIC PACA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/arsenic-paca) |
| Artech Infosystems Ltd. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/artech-infosystems-ltd) |
| Ascend HR | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ascend-hr) |
| ASRC Federal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/asrc-federal) |
| AssuranceAmerica | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/assuranceamerica) |
| Assurant | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/assurant) |
| Astreya | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/astreya) |
| AutonomIQ | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/autonomiq) |
| Aviagen Inc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/aviagen-inc) |
| Avidbots Corp. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/avidbots-corp) |
| AvidXchange | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/avidxchange) |
| B3 Consulting Poland | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/b3-consulting-poland) |
| Banco Plata, S.A., Institución de Banca Múltiple | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/banco-plata-s-a-institucion-de-banca-multiple) |
| Banner Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/banner-health) |
| BarkleyOKRP | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/barkleyokrp) |
| Bausch Health US, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bausch-health-us-llc) |
| BayApps, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bayapps-inc) |
| BCD Travel | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bcd-travel) |
| BCG X | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bcg-x) |
| BCW Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bcw-group) |
| Be \| Shaping the Future | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/be-shaping-the-future) |
| Beecruit Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/beecruit-pte-ltd) |
| BEEU Infotech Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/beeu-infotech-limited) |
| Benzinga | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/benzinga) |
| Berkeley Square IT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/berkeley-square-it) |
| BetMGM | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/betmgm) |
| beyondservice GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/beyondservice-gmbh) |
| BforeAI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bforeai) |
| BioIntelliSense | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/biointellisense) |
| BIP Brasil | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bip-brasil) |
| BizFirst | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bizfirst) |
| Black Financial Consult | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/black-financial-consult) |
| Blackbuck Insights | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/blackbuck-insights) |
| Blockworks | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/blockworks) |
| Blue Cross and Blue Shield of Kansas | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/blue-cross-and-blue-shield-of-kansas) |
| Bluedot | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bluedot) |
| BlueFlag LLP | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/blueflag-llp) |
| Blueland | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/blueland) |
| Bluprintx | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/bluprintx) |
| Boardroom Appointments | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/boardroom-appointments) |
| Boosted Technology | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/boosted-technology) |
| Brewco Marketing Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/brewco-marketing-group) |
| Brompton Associates Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/brompton-associates-pte-ltd) |
| Built Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/built-technologies) |
| Burq | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/burq) |
| Busigence Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/busigence-technologies) |
| Business Evasion | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/business-evasion) |
| Businessolver | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/businessolver) |
| C9 Staff | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/c9-staff) |
| Cambium Learning Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cambium-learning-group) |
| CAMP Systems | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/camp-systems) |
| Canopy Growth Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/canopy-growth-corporation) |
| Capita | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/capita) |
| Capital One | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/capital-one) |
| Cardinal Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cardinal-health) |
| CareDx, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/caredx-inc) |
| Carousell Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/carousell) |
| Carrington | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/carringtonwholesale) |
| Carrington | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/carringtonms) |
| Carrot Fertility | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/carrot-fertility) |
| Carrum Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/carrum-health) |
| Cars.com | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cars-com) |
| Cash Access UK | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cash-access-uk) |
| Cashea | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cashea) |
| Cayuse Holdings | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cayuse-holdings) |
| CCC Intelligent Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ccc-intelligent-solutions) |
| Cedars-Sinai Medical Center | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cedars-sinai-medical-center) |
| CEO Lawyer Personal Injury Law Firm | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ceo-lawyer-personal-injury-law-firm) |
| Ceox Services Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ceox-services-ltd) |
| Cerity Partners Management LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cerity-partners-management-llc) |
| Certify | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/certify) |
| Cherokee Federal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cherokee-federal) |
| Chickasaw Nation Industries, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/chickasaw-nation-industries-inc) |
| Chip | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/chip) |
| Circana | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/circana) |
| Clear Fracture | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/clear-fracture) |
| ClearCaptions, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/clearcaptions-llc) |
| Climate First Bank | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/climate-first-bank) |
| Cloud Counselage Pvt Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cloud-counselage-pvt-ltd) |
| Cloudscouts Software Solutions LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cloudscouts-software-solutions-llc) |
| CMT SERVICES, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cmt-services-inc) |
| CNA Insurance | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cna-insurance) |
| Coalition | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/coalition) |
| Code for America | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/code-for-america) |
| Codea IT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/codea-it) |
| Codest Ltd. Company No. 12590542, VAT number: GB363431020 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/codest-ltd-company-no-12590542-vat-number-gb363431020) |
| Cognyte | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cognyte) |
| Comagine Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/comagine-health) |
| Comerit | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/comerit) |
| CommIT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/commit) |
| Committedstaff | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/committedstaff) |
| commonsku | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/commonsku) |
| Community Health Systems | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/community-health-systems) |
| Compass Health Network | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/compass-health-network) |
| Compass UOL | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/compass-uol) |
| Conduent | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/conduent) |
| Connection | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/connection) |
| ConnexR Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/connexr-solutions) |
| Consileon Business Consultancy GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/consileon-business-consultancy-gmbh) |
| Corndel | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/corndel) |
| Correlation One | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/correlation-one) |
| Countus | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/countus) |
| COVENTEK, INC. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/coventek-inc) |
| CoVet | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/covet) |
| Crane Worldwide Logistics | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/crane-worldwide-logistics) |
| Crawford & Company | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/crawford-company) |
| Create Music Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/create-music-group) |
| Cribl | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cribl) |
| Crisis Prevention Institute | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/crisis-prevention-institute) |
| Cummins | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cummins) |
| Curvion Blue | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/curvion-blue) |
| Customers Bank | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/customers-bank) |
| CYBERA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cybera) |
| Cyntegrity | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/cyntegrity) |
| D.A. Davidson Companies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/d-a-davidson-companies) |
| D2B | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/d2b) |
| DAC Beachcroft | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dac-beachcroft) |
| DaCodes | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dacodes) |
| Darkroom | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/darkroom) |
| Data Edge | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/data-edge) |
| DataChef | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/datachef) |
| Datamatics Careers- Philippines | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/datamatics-careers-philippines) |
| DataSmart Point | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/datasmart-point) |
| Dautom | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dautom) |
| DCX PH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dcx-ph) |
| Deckers Brands | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/deckers-brands) |
| dentsu international | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dentsu-international) |
| Deutsche Telekom | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/deutsche-telekom) |
| Dev.Pro | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dev-pro) |
| Devop.One | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/devop-one) |
| Devoteam | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/devoteam) |
| DeVry University | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/devry-university) |
| Devsu | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/devsu) |
| Dexterra Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dexterra-group) |
| Dhan AI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dhan-ai) |
| DIGITALL Nature Corp | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/digitall-nature-corp) |
| Dikshatek | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dikshatek-co) |
| DMI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dmi) |
| DOZR | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dozr) |
| DRIMO | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/drimo) |
| Dropbox | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dropbox) |
| DysrupIT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/dysrupit) |
| eBay Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ebay-inc) |
| Echelon Solar Power | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/echelon-solar-power) |
| Edgewater Federal Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/edgewater-federal-solutions) |
| Edwards Lifesciences | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/edwards-lifesciences) |
| eHealth, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ehealth-inc) |
| EHS Support, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ehs-support-llc) |
| Elan Solutions LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/elan-solutions-llc) |
| Elfonze Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/elfonze-technologies) |
| Elsevier | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/elsevier) |
| EMED Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/emed-group) |
| Emetlab | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/emetlab) |
| Emma | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/emma) |
| EnableComp | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/enablecomp) |
| Energy Point Consulting, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/energy-point-consulting-llc) |
| Engine | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/engine) |
| EQT Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/eqt-corporation) |
| Equum Medical | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/equum-medical) |
| ERG | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/erg) |
| Etleap | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/etleap) |
| Eton Technologies Private Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/eton-technologies-private-limited) |
| EUROPEAN DYNAMICS | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/european-dynamics) |
| European Payments Initiative (EPI) | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/european-payments-initiative-epi) |
| ev.energy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ev-energy) |
| Eve | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/eve) |
| Everfi | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/everfi) |
| Everglade Works | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/everglade-works) |
| Evidence Based Associates | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/evidence-based-associates) |
| Evnek Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/evnek-technologies) |
| Evolution Sports Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/evolution-sports-group) |
| Ex Parte | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ex-parte) |
| ExactCare Pharmacy, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/exactcare-pharmacy-llc) |
| Exavalu | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/exavalu) |
| Experian | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/experian) |
| Expert VA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/expert-va) |
| FCamara | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fcamara) |
| FHI 360 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fhi-360) |
| FindTutors | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/findtutors) |
| Five9 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/five9) |
| FormativGroup | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/formativgroup) |
| Fortive | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fortive) |
| Fortrex, Inc. Ltd. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fortrex-inc-ltd) |
| Foxit Software | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/foxit-software) |
| FPT Asia Pacific Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fpt-asia-pacific-pte-ltd) |
| Franciscan Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/franciscan-health) |
| Fueled | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fueled) |
| Fujifilm | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fujifilm) |
| Fullbay | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fullbay) |
| fullthrottle.ai | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fullthrottle-ai) |
| Fulton Bank | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/fult) |
| futureproof | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/futureproof) |
| gaiia | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gaiia) |
| Gather AI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gather-ai) |
| GATX | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gatx) |
| Gelt | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gelt) |
| General Motors | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/general-motors) |
| Genesis | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/genesis) |
| GenLogs Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/genlogs-corporation) |
| George Bernard Consulting | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/george-bernard-consulting) |
| Get My Course | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/get-my-course) |
| GitLab | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gitlab-com) |
| Global Channel Management, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/global-channel-management-inc) |
| GM Financial | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gm-financial) |
| GoCanvas | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gocanvas) |
| Golden 1 Talent Acquisition Team | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/golden-1-talent-acquisition-team) |
| Grady Health System | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grady-health-system) |
| Graphcore | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/graphcore) |
| Greystar | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/greystar) |
| GRID | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grid) |
| Grid Status | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grid-status) |
| Grow2FIT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grow2fit) |
| Growth Leads | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/growth-leads) |
| Grupo CVLB | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grupo-cvlb) |
| Grupo OLX | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/grupo-olx) |
| Guidewire Software | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/guidewire-software) |
| Gulf Coast Automation Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/gulf-coast-automation-group) |
| Hack The Box | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hack-the-box) |
| Hanover Research | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hanover-research) |
| Hard Rock Digital | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hard-rock-digital) |
| HAUSGOLD - talocasa GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hausgold-talocasa-gmbh) |
| HawodTech Solutions Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hawodtech-solutions-inc) |
| HeadFirst Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/headfirst-group) |
| Healthie | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/healthie) |
| Helen of Troy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/helen-of-troy) |
| Hercules | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hercules) |
| hermeneutic Investments | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hermeneutic-investments) |
| HEROIC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/heroic) |
| Hexaware Technologies Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hexaware-technologies-limited) |
| Hey Contact Heroes | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hey-contact-heroes) |
| Hiflylabs | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hiflylabs) |
| HII | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hii) |
| Hivex | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hivex) |
| Holafly | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/holafly) |
| Holos Media | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/holos-media) |
| HOME DEPOT U.S.A., INC. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/home-depot-u-s-a-inc) |
| Hometap | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hometap) |
| Hopscotch Primary Care | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hopscotch-primary-care) |
| Horizon Industries | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/horizon-industries) |
| HostPapa | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hostpapa) |
| HR Plus (Talent) Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hr-plus-talent-limited) |
| HRTx, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hrtx-inc) |
| HSO Group B.V. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hso-group-b-v) |
| Hudson Manpower | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/hudson-manpower) |
| HumanIT Digital Consulting | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/humanit-digital-consulting) |
| Huzzle | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/huzzle) |
| IBA Infotech Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/iba-infotech-inc) |
| ICB GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/icb-gmbh) |
| Icon Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/icon-health) |
| IDT Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/idt-corporation) |
| IMAGINEEER LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/imagineeer-llc) |
| In Tandem | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/in-tandem) |
| indigoChart Technologies India Pvt Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/indigochart-technologies-india-pvt-ltd) |
| Industrial Electric Manufacturing | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/industrial-electric-manufacturing) |
| Inflect | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/inflect) |
| Info Resume Edge | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/info-resume-edge) |
| Informatec | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/informatec) |
| InfraCloud | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/infracloud) |
| Ingredion | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ingredion) |
| Innodata | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/innodata) |
| inovex GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/inovex-gmbh) |
| Intertwine Associates | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/intertwine-associates) |
| Intescia Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/intescia-group) |
| Intuition Machines | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/intuition-machines) |
| IO Tech Solutions Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/io-tech-solutions-limited) |
| IQVIA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/iqvia) |
| IRIUM | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/irium) |
| ITMates | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/itmates) |
| IWConnect | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/iwconnect) |
| Jalasoft | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jalasoft) |
| Jimmy Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jimmy-technologies) |
| Jobs for Humanity | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jobsforlebanon) |
| Jobsity | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jobsity) |
| Jobskey Consultancy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jobskeyconsultancy) |
| Jooble | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jooble) |
| Jusbrasil | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/jusbrasil) |
| Kainos | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kainos) |
| Kanadevia Inova North America | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kanadevia-inova-north-america) |
| KANINI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kanini) |
| Karat | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/karat) |
| Karoo Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/karoo-health) |
| KBR, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kbr-inc) |
| Keys Recruiters | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/keys-recruiters) |
| Keystone Agency Partners (KAP) | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/keystone-agency-partners-kap) |
| Kinaxis | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kinaxis) |
| Kinsei Talent | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kinsei-talent) |
| Kirin | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kirin) |
| KIS Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kis-solutions) |
| Klar Technologies GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/klar-technologies-gmbh) |
| KLDiscovery | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kldiscovery) |
| knowmad mood | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/knowmad-mood) |
| Koalafi | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/koalafi) |
| Koniag Government Services | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/koniag-government-services) |
| Kreative Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/kreative-technologies) |
| Krisvconsulting Services Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/krisvconsulting-services-pte-ltd) |
| Latent Bridge | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/latent-bridge) |
| Latino Legends | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/latino-legends) |
| Launch Potato | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/launch-potato) |
| Launchmetrics | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/launchmetrics) |
| Law At Ease | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/law-at-ease) |
| Leadtech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/leadtech) |
| Learntastic | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/learntastic) |
| Legence | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/legence) |
| Legend | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/legend) |
| LendingTree | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lendingtree) |
| LevelUp | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/thelevelup) |
| Liberty Mutual | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/liberty-mutual) |
| Lifebit | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lifebit) |
| Lifted (an Upwork Company) | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lifted-an-upwork-company) |
| Lighthouse | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mylighthouse) |
| Liquid Thought | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/liquid-thought) |
| Livefront | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/livefront) |
| LocalStack | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/localstack) |
| Lockheed Martin Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lockheed-martin-corporation) |
| Logic20/20 Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/logic20-20-inc) |
| Look4IT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/look4it) |
| Lumina | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lumina) |
| Lumiq | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/lumiq-ai) |
| Machinify | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/machinify) |
| Mactores | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mactores) |
| Madello Consulting | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/madello-consulting) |
| Madiff | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/madiff) |
| Magnetics | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/magnetics) |
| Management Solutions LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/management-solutions-llc) |
| ManTech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mantech) |
| marcus evans | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/marcus-evans) |
| Margera | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/margera) |
| Marktine Technology Solutions Pvt Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/marktine-technology-solutions-pvt-ltd) |
| Marlabs Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/marlabs-inc) |
| Martello Re Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/martello-re-limited) |
| MasterBrand | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/masterbrand) |
| Maxana | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/maxana) |
| Mayflower | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mayflower) |
| McKesson | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mckesson) |
| MedShr | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/medshr) |
| MEDvidi | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/medvidi) |
| Menasha Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/menasha-corporation) |
| Mercury Insurance | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mercury-insurance) |
| MetLife Legal Plans | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/metlife-legal-plans) |
| MGID | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mgid) |
| Milsoft Utility Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/milsoft-utility-solutions) |
| MindBridge Analytics Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mindbridge-analytics-inc) |
| MiniMed | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/minimed) |
| Misfits Market | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/misfits-market) |
| Mitratech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mitratech) |
| ModSquad | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/modsquad) |
| Modular Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/modular-solutions) |
| MoneyGram | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/moneygram) |
| Monzo | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/monzo) |
| Mosaic Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mosaic-health) |
| Motive | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/thinkmotive) |
| Motum | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/motum) |
| mPulse Mobile | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mpulse-mobile) |
| MTP Métodos e Tecnologia – Brasil | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mtp-metodos-e-tecnologia-brasil) |
| Müller`s Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/muller-s-solutions) |
| Mutual of Omaha Mortgage | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mutual-of-omaha-mortgage) |
| MWDN | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mwdn) |
| My Recruiter Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/my-recruiter-inc) |
| myPOS | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/mypos) |
| Nacre Capital | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nacre-capital) |
| Nakupuna Companies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nakupuna-companies) |
| Naveera Technology LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/naveera-technology-llc) |
| NBCUniversal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nbcuniversal-com) |
| NCFE | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ncfe) |
| NEO GROUP | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/neogroup-eu) |
| Netflix | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/netflix) |
| NetForemost, Inc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/netforemost-inc) |
| NetImpact Strategies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/netimpact-strategies) |
| NeueHealth | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/neuehealth) |
| New Meridian | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/new-meridian) |
| Newbridge | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/newbridge) |
| NexonIT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nexonit) |
| Niche | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/niche) |
| Nimble Gravity | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nimble-gravity) |
| Niyam IT | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/niyam-it) |
| NoblQ | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/noblq) |
| North American Electric Reliability Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/north-american-electric-reliability-corporation) |
| Novalink Solutions  LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/novalink-solutions-llc) |
| NRG | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nrgenergy) |
| Nucs AI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nucs-ai) |
| Nüvitek | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nuvitek) |
| Nymbus | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/nymbus) |
| Object Computing, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/object-computing-inc) |
| Ochsner Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ochsner-health) |
| Omada Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/omada-health) |
| OmegaHires | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/omegahires) |
| Onebeat | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/onebeat) |
| OneBullEx | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/onebullex) |
| OneDigital | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/onedigital) |
| OneForma | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/oneforma) |
| OneOcean | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/oneocean) |
| OpenDataJobs | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/opendatajobs) |
| Openvale Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/openvale-group) |
| Opinov8 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/opinov8) |
| OPTIVEUM sp. z o.o. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/optiveum-sp-z-o-o) |
| Overture Rede | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/overture-rede) |
| OZ | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/oz) |
| P@thlion Staffing Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/p-thlion-staffing-inc) |
| Parallels | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/parallels) |
| ParallelStaff | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/parallelstaff) |
| Parsons Corporation | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/parsons-corporation) |
| Patriot Software | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/patriot-software) |
| Pavago | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/pavago) |
| Pearson | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/pearson) |
| People Profilers Vietnam | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/people-profilers-vietnam) |
| PeopleFinders | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/peoplefinders) |
| peopleworth | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/peopleworth) |
| Perficient | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/perficient) |
| Personify Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/personify-health) |
| Planned Systems International | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/planned-systems-international) |
| Platform&Co Pte. Ltd. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/platform-co-pte-ltd) |
| PointClickCare | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/pointclickcare) |
| Pontoonglobal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/pontoonglobal) |
| PradeepIT Consulting Services Pvt Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/pradeepit-consulting-services-pvt-ltd) |
| Prime Therapeutics | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/prime-therapeutics) |
| Printful | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/printful) |
| Priority | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/priority) |
| Prismfly | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/prismfly) |
| Progressive Leasing | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/progressive-leasing) |
| ProMach | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/promach) |
| Propelis | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/propelis) |
| PROSTAFF Schweiz GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/prostaff-schweiz-gmbh) |
| Protecht | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/protecht) |
| Protective | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/protective) |
| Provoke Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/provokesolutions) |
| Prudential Financial | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/prudential-financial) |
| Public Consulting Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/public-consulting-group) |
| Punch Cyber | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/punch-cyber) |
| Qode | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/qode) |
| Qualifacts | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/qualifacts) |
| Quantum Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/quantum-health) |
| Quartile | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/quartile) |
| Quorso | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/quorso) |
| Quorum Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/quorum-health) |
| Rackspace US, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rackspace-us-inc) |
| Radiology Partners | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/radiology-partners) |
| RBGlobal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rbauction) |
| RCH Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rch-solutions) |
| RD Saúde - Corporativo | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rd-saude-corporativo) |
| ReachExt K.K. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/reachext-k-k) |
| Ready | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/joinready) |
| RecruitNest Consulting | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/recruitnest-consulting) |
| RecruityTalent | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/recruitytalent) |
| Reddit | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/reddit) |
| Reflex Media, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/reflex-media-inc) |
| Relation Insurance | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/relation-insurance) |
| RELX | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/relx) |
| RemoteOnline | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/remoteonline) |
| Resilinc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/resilinc) |
| Resource Consultants, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/resource-consultants-inc) |
| ResourceWise | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/resourcewise) |
| Rev Star | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rev-star) |
| ReWorks Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/reworks-solutions) |
| Rightway | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rightway) |
| Riva Scientific LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/riva-scientific-llc) |
| robusta | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/robusta) |
| ROI Agency | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/roi-agency) |
| RTX | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rtx) |
| Rubicon Path | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/rubicon-path) |
| Runware | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/runware) |
| Ryan Specialty | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ryanspecialty) |
| S&P Global | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/s-p-global) |
| S5 Stratos | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/s5-stratos) |
| Saaf Finance | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/saaf-finance) |
| Saalex | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/saalex) |
| SafeRide Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/saferide-health) |
| Sage | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sage) |
| Salas O&#x27;Brien | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/salas-o-x27-brien) |
| Samsara | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/samsara) |
| Sanford Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sanford-health) |
| Sapiens | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sapiens) |
| SAPSOL Technologies Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sapsol-technologies-inc) |
| Savvital | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/savvital) |
| Scalepex | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/scalepex) |
| Scalian | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/scalian) |
| SE Ranking | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/se-ranking) |
| Seeking Alpha | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/seeking-alpha) |
| Sehyog Academy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sehyog-academy) |
| Seven Seven | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/seven-seven) |
| Sevita | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sevita) |
| Shiftmove | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/shiftmove) |
| Siegen HR Solutions, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/siegen-hr-solutions-inc) |
| Sinch | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sinch) |
| SIRVA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sirva) |
| Skeelo | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/skeelo) |
| Skift | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/skift) |
| Skillerszone | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/skillerszone) |
| SmartRecruiters Inc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/smartrecruiters-inc) |
| Snowflake | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/snowflake) |
| Softtek | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/softtek) |
| Sonny's Enterprises LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sonny-s-enterprises-llc) |
| SouthState Bank | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/southstate-bank) |
| SpaceCoast AV Consultants, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/spacecoast-av-consultants-llc) |
| SparePartsNow GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sparepartsnow-gmbh) |
| SPD Technology | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/spd-technology) |
| Spie batignolles | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/spie-batignolles) |
| Sporty Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sporty-group) |
| Sprout Social | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sprout-social) |
| SQLI | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sqli) |
| SRS Acquiom | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/srs-acquiom) |
| St. Jude Children's Research Hospital | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/st-jude-children-s-research-hospital) |
| StaffWorthy | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/staffworthy) |
| Stanley Black & Decker | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/stanley-black-decker) |
| Start.io | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/start-io) |
| Stitch Consulting Services, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/stitch-consulting-services-inc) |
| Stratpoint | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/stratpoint) |
| Stride, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/stride-inc) |
| STV Inc | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/stv-inc) |
| Sun Nuclear | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sun-nuclear) |
| Superset | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/superset) |
| Synthlane Technologies Private Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/synthlane-technologies-private-limited) |
| Synthomer | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/synthomer) |
| Sysco | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/sysco) |
| TalentIn | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/talentin) |
| Talentwelove | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/talentwelove) |
| Talkspace | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/talkspace) |
| TASQ Staffing Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tasq-staffing-solutions) |
| Taxwell | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/taxwell) |
| TD SYNNEX | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/td-synnex) |
| team.blue | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/team-blue) |
| Teams Squared | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/teams-squared) |
| TeamWorx Security | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/teamworx-security) |
| Tebra | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tebra) |
| TechCow | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/techcow) |
| TEHORA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tehora) |
| Telefonica Tech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/telefonica-tech) |
| Telemedi | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/telemedi) |
| Tenna | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tenna) |
| TetraScience | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tetrascience) |
| The ACI Group, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-aci-group-inc) |
| The Agile Monkeys | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-agile-monkeys) |
| The CE Shop | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-ce-shop) |
| The Information Lab | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-information-lab) |
| The Leukemia & Lymphoma Society | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-leukemia-lymphoma-society) |
| The Medical College of Wisconsin, Inc. | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/the-medical-college-of-wisconsin-inc) |
| Tier One Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tier-one-technologies) |
| Tiko | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tiko-org) |
| TMS, LLC | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tms-llc) |
| Tonic3 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tonic3) |
| Toplent | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/toplent) |
| Trax Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/trax-technologies) |
| Trifecta Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/trifecta-technologies) |
| Trilogy Federal | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/trilogy-federal) |
| TripAdvisor | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tripadvisor) |
| Tripledot Studios | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tripledot-studios) |
| TSPi | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/tspi) |
| UJET | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ujet) |
| Ultimus Fund Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ultimus-fund-solutions) |
| Underscore Marketing | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/underscore-marketing) |
| Unholster | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/unholster) |
| Unison Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/unison-group) |
| Unisys | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/unisys) |
| Unit21 | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/unit21) |
| Unravel Carbon Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/unravel-carbon-pte-ltd) |
| UpSkill | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/upskill) |
| UPSTART | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/upstart-co) |
| Urban SDK | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/urban-sdk) |
| UrbanSoft SA | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/urbansoft-sa) |
| Ursa Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/ursa-health) |
| URUS Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/urusgroup) |
| US Acute Care Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/us-acute-care-solutions) |
| UW Health | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/uw-health) |
| Valce Talent Solutions | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/valce-talent-solutions) |
| Valenz | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/valenz) |
| Valerie Group | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/valerie-group) |
| Valtech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/valtech-us) |
| Vanderbilt University | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vanderbilt-university) |
| Veeva Systems | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/veeva-systems) |
| Vein Standard Metals | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vein-standard-metals) |
| VendueTech | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/venduetech) |
| Veramed | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/veramed) |
| Veremark | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/veremark) |
| Virgin Voyages | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/virgin-voyages) |
| Virtual Talent Latam | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/virtual-talent-latam) |
| Visio Lending | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/visio-lending) |
| VivSoft Technologies | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vivsoft-technologies) |
| Vomela Company | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vomela-company) |
| VORKIS knows what employer wants | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vorkis-knows-what-employer-wants) |
| Vrinda International | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vrinda-international) |
| VT Markets | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/vt-markets) |
| Waterfall Technology Consulting Partners | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/waterfall-technology-consulting-partners) |
| WebEngage | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/webengage) |
| WebLife Stores | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/weblife-stores) |
| WellBe Senior Medical | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wellbeseniormedical) |
| WellSky | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wellsky) |
| Wesper | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wesper) |
| WGT EHR Pte Ltd | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wgt-ehr-pte-ltd) |
| Wiley | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wiley) |
| Wipro Limited | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wipro-limited) |
| Wolfspeed | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wolfspeed) |
| Woodmark Consulting GmbH | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/woodmark-consulting-gmbh) |
| Workday | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/workday) |
| WOW Remote Teams | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/wow-remote-teams) |
| XDi - Experience Design Institut | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/xdi-experience-design-institut) |
| Xperteez Technology | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/xperteez-technology) |
| Yaqeen Institute | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/yaqeen-institute) |
| Zensar | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/zensar) |
| Zillow | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/zillow) |
| Zup | GLOBAL | 0 |  |  | [himalayas](https://himalayas.app/companies/zup) |

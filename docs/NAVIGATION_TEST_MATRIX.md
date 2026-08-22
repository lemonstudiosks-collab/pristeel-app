# PPPP Critical Navigation Test Matrix

This is the minimum release matrix for changes that touch Home, Projects, Project Workspace or the procurement flow.

| From | Action | Expected destination / behavior |
|---|---|---|
| Home | `Projektet` | `page-workspace-projects` active, Home inactive |
| Home / Në pritje | click project | Project Brief opens, no navigation yet |
| Project Brief | `Hap projektin` | `page-workspace-project` active with project content |
| Home / work card | click project | same Project Workspace entry |
| Projects | click row / `Hap` | same Project Workspace entry |
| Project Workspace | `← Projektet` | Projects workspace active |
| Project Workspace | Përmbledhja | canonical project overview |
| Project Workspace | Prokurimi | canonical procurement flow |
| Project Workspace | Ekzekutimi | project execution area |
| Project Workspace | Financat | project finance area |
| Project Workspace | Skedarët | project files area |
| Project Workspace | Komunikimi | project communication area |
| Prokurimi | BOM | BOM state or explicit no-BOM state, never blank |
| Prokurimi | RFQ | RFQ state/editor bridge, never blank |
| Prokurimi | Ofertat e furnitorëve | supplier-offer state/list, never blank |
| Prokurimi | Krahasimi i ofertave | normalized comparison or explicit empty state |
| Krahasimi | supplier `Detaje` | inline breakdown; no page navigation |
| Prokurimi | Çmimi i shitjes | pricing summary/editor bridge |
| Prokurimi | Oferta për klientin | current draft/history/editor bridge |
| Legacy editor | back/return | same project and originating canonical stage |

Release blockers:
- blank destination after a click
- both source and destination pages active simultaneously
- outer application ancestor hidden by project cleanup
- project id/context lost
- supplier detail causes route change
- a Home delayed renderer steals the page after user navigation

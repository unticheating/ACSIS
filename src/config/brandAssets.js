/**
 * Brand placeholders — swap each export independently when ACSIS artwork is ready.
 *
 * APP_LOGO_SRC     → in-app UI (PlpLogo, sidebar fallback, login, exam headers)
 * DOCUMENT_LOGO_SRC → browser tab favicon only (main.jsx)
 *
 * DOCUMENT_LOGO_SRC only — changing it does not affect APP_LOGO_SRC.
 * After changing, hard-refresh the tab (Ctrl+Shift+R) — browsers cache favicons aggressively.
 */
import appLogoSrc from '../../img/plpupdatedlogo 3.png'
import documentLogoSrc from '../../img/acsis-logo.svg'

/** Sidebar, headers, exam chrome, auth shell */
export const APP_LOGO_SRC = appLogoSrc

/** Browser tab icon (favicon) only */
export const DOCUMENT_LOGO_SRC = documentLogoSrc

export const APP_LOGO_ALT = 'Pamantasan ng Lungsod ng Pasig'

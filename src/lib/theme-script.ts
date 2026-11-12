// Runs in the page head BEFORE anything is drawn, so the right theme shows with no flash.
// A saved choice ("light" or "dark") wins. With no saved choice the theme follows the device setting,
// and keeps following it if the device switches (for example at sunset) until the visitor presses the sun/moon button.
// It also sets the browser bar colour ("theme-color") from the page colour in src/styles/colors.css.
export const THEME_KEY = "spotted-theme";
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,k="${THEME_KEY}",s=null;try{s=localStorage.getItem(k)}catch(e){}var m=window.matchMedia("(prefers-color-scheme: dark)");d.dataset.theme=s==="light"||s==="dark"?s:(m.matches?"dark":"light");if(m.addEventListener){m.addEventListener("change",function(e){var t=null;try{t=localStorage.getItem(k)}catch(x){}if(t!=="light"&&t!=="dark"){d.dataset.theme=e.matches?"dark":"light"}})}try{var c=document.querySelector('meta[name="theme-color"]');if(!c){c=document.createElement("meta");c.name="theme-color";document.head.appendChild(c)}c.content=getComputedStyle(d).getPropertyValue("--page").trim()}catch(e){}})();`;

// Runs in the page head BEFORE anything is drawn, so the saved theme shows with no flash.
// Default is dark. Only the word "light" switches it to light.
export const THEME_KEY = "spotted-theme";
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

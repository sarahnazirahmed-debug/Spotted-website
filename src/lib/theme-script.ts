// Runs in the page head BEFORE anything is drawn, so the saved theme shows with no flash.
// Default is dark. Only the word "light" switches it to light.
// It also sets the browser bar colour ("theme-color") from the page colour in src/styles/colors.css.
export const THEME_KEY = "spotted-theme";
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}try{var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=getComputedStyle(document.documentElement).getPropertyValue("--page").trim()}catch(e){}`;

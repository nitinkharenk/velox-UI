export const initialThemeScript: string = `(function(){
  var PALETTES={
    blue:["#F9F9FA","#0465ED","#03354E","#808180","#131314"],
    red:["#F9F9FA","#F93E39","#131314","#808180","#000000"],
    green:["#F9F9FA","#07AA73","#03354E","#808180","#131314"],
    purple:["#F9F9FA","#642EF6","#1A103F","#808180","#131314"],
    yellow:["#F9F9FA","#FACA06","#131314","#808180","#000000"],
    cyan:["#F9F9FA","#15CBFD","#0A4F63","#808180","#131314"],
    orange:["#F9F9FA","#FF5A1F","#3A1F2D","#808180","#131314"],
    beige:["#F9F9FA","#D3C6C2","#6E6A67","#131314","#000000"],
    pure_red:["#F9F9FA","#FF2A2A","#131314","#808180","#000000"],
    monochrome:["#FFFFFF","#CFCFCF","#808080","#333333","#000000"]
  };
  var DEFAULT={palette:"blue",mode:"dark"};
  var cfg=DEFAULT;
  try{
    var raw=localStorage.getItem("velox-theme")||localStorage.getItem("veloxui-theme");
    if(raw){
      var p=JSON.parse(raw);
      if(p&&PALETTES[p.palette]&&(p.mode==="light"||p.mode==="dark")){
        cfg=p;
        if(!localStorage.getItem("velox-theme")){
          localStorage.setItem("velox-theme",raw);
          localStorage.removeItem("veloxui-theme");
        }
      }
    }
  }catch(e){}
  var c=PALETTES[cfg.palette];
  var isDark=cfg.mode==="dark";
  var el=document.documentElement;
  el.style.setProperty("--velox-palette-bg",     isDark?c[4]:c[0]);
  el.style.setProperty("--velox-palette-accent",  c[1]);
  el.style.setProperty("--velox-palette-surface", c[2]);
  el.style.setProperty("--velox-palette-muted",   c[3]);
  el.style.setProperty("--velox-palette-base",    isDark?c[0]:c[4]);
  el.dataset.theme=cfg.mode;
})();`

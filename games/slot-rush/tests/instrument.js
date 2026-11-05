// Local QA only. Deterministic frame pump for fair before/after measurements.
window.QA={queue:new Map(),id:0,ops:{},errors:[],reset(){this.ops={};},pump(now){const q=[...this.queue.values()];this.queue.clear();q.forEach(f=>f(now));}};
window.requestAnimationFrame=f=>{QA.queue.set(++QA.id,f);return QA.id;};
window.cancelAnimationFrame=id=>QA.queue.delete(id);
for(const name of ['lineTo','stroke','drawImage','createImageData']){
 const fn=CanvasRenderingContext2D.prototype[name];
 CanvasRenderingContext2D.prototype[name]=function(...args){QA.ops[name]=(QA.ops[name]||0)+1;return fn.apply(this,args);};
}
window.addEventListener('error',e=>QA.errors.push(e.message));

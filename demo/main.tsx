// Opennan Chart development and distribution demo.
import React,{Component,type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './style.css';
class WorkspaceBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div style={{padding:32,color:'#e8e8ea',fontFamily:'system-ui'}}><h1>Chart could not render</h1><p>Your saved JavaScript draft is still available. Reload the workspace to try again.</p><button onClick={()=>location.reload()} style={{padding:10,border:'1px solid #7dd3fc',marginTop:12}}>Reload workspace</button></div>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<WorkspaceBoundary><App/></WorkspaceBoundary>);

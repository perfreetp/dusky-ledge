/* @refresh reload */
import { render } from 'solid-js/web'
import App from './App.tsx'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('根节点 #root 缺失')
render(() => <App />, root)

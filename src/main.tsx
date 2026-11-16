/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import UnsupportedGpu from './components/UnsupportedGpu';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('缺少 #root 挂载点');

if (!('gpu' in navigator)) {
  render(() => <UnsupportedGpu />, root);
} else {
  render(() => <App />, root);
}

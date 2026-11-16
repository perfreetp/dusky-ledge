import { actions, state } from '../state/store';
import type { LayerKey } from '../types';

import { css } from '../ui/style';
const LAYER_LABELS: Record<LayerKey, string> = {
  tunnel: '洞体层',
  speleo: '景观层（钟乳石）',
  trail: '步道层',
  lights: '灯光层',
};

export default function LayerPanel() {
  return (
    <>
      <div class="section-title">图层开关</div>
      {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => (
        <div class="checkline">
          <input
            type="checkbox"
            checked={state.layers[key]}
            onChange={() => actions.toggleLayer(key)}
            id={`layer-${key}`}
          />
          <label for={`layer-${key}`} style={css({ margin: 0 })}>
            {LAYER_LABELS[key]}
          </label>
        </div>
      ))}
    </>
  );
}

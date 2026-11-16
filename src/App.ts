import { defineComponent, h, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { store } from '@/state/editor';

const navStyle = 'text-decoration:none;padding:4px 11px;border-radius:5px;color:var(--text-dim);font-size:12.5px';

export default defineComponent({
  name: 'App',
  setup() {
    const route = useRoute();
    const nav = [
      { to: '/plans', label: '方案管理', match: /^\/(plans|editor)/ },
      { to: '/versions', label: '版本库', match: /^\/versions/ },
      { to: '/training', label: '培训考核', match: /^\/(training|practice|grade|summary)/ },
      { to: '/help', label: '使用说明', match: /^\/help/ },
    ];
    const user = ref(localStorage.getItem('marking.user') || 'EHS 管理员');

    return () =>
      h('div', { class: 'app-shell' }, [
        h('header', { class: 'topbar' }, [
          h(RouterLink, { to: '/plans', class: 'brand', style: 'text-decoration:none;color:inherit' }, () => [
            h('svg', { width: 20, height: 20, viewBox: '0 0 32 32' }, [
              h('rect', { width: 32, height: 32, rx: 7, fill: '#101a26' }),
              h('path', {
                d: 'M5 26 L16 6 L27 26',
                stroke: '#38bdf8',
                'stroke-width': 2.6,
                fill: 'none',
                'stroke-linejoin': 'round',
              }),
              h('path', { d: 'M9 21h14', stroke: '#f2c200', 'stroke-width': 2.6, 'stroke-dasharray': '3 2' }),
            ]),
            h('span', null, [h('div', null, '车间标线编辑器'), h('small', null, 'Floor Marking Studio')]),
          ]),
          h(
            'nav',
            { class: 'seg', style: 'margin-left:6px' },
            nav.map((item) =>
              h(
                RouterLink,
                {
                  key: item.to,
                  to: item.to,
                  class: ['navlink', { active: item.match.test(route.path) }],
                  style: item.match.test(route.path)
                    ? navStyle + ';background:var(--accent-soft);color:#bae6fd'
                    : navStyle,
                },
                () => item.label
              )
            )
          ),
          h('div', { class: 'spacer' }),
          h('span', { class: 'pill', title: '当前使用者' }, user.value),
        ]),
        h('div', { style: 'flex:1;min-height:0;position:relative' }, [h(RouterView)]),
        h(
          'div',
          { class: 'toast-stack' },
          store.toasts.value.map((t) => h('div', { key: t.id, class: ['toast', t.tone] }, t.message))
        ),
      ]);
  },
});

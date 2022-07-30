'use strict';

import './popup.css';
// import { createApp } from 'vue/dist/vue.esm-bundler';
import { createApp } from 'vue';
import App from './components/App.vue';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheckCircle, faTriangleExclamation, faCircleQuestion, faUpRightFromSquare, faFilter, faArrowRotateRight, faClipboard, faClipboardCheck } from '@fortawesome/free-solid-svg-icons'



(function () {
  library.add(faCheckCircle, faTriangleExclamation, faCircleQuestion, faUpRightFromSquare, faFilter, faArrowRotateRight, faClipboard, faClipboardCheck)
  createApp(App)
  .component('font-awesome-icon', FontAwesomeIcon)
  .mount('#app');
})();

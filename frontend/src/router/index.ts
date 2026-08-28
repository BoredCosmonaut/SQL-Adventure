import { createWebHistory,createRouter } from "vue-router";
import authScreen from "../views/authScreenView.vue";
import GameScreenView from "../views/gameScreenView.vue";
import retiredScreenView from "../views/retiredScreenView.vue";
import { player } from "../store/session";

const router = createRouter({
    history:createWebHistory(),
    routes:[
        {path:'/login',component:authScreen},
        {path:'/',redirect:'/login'},
        {path:'/game', component:GameScreenView},
        {path:'/retired', component:retiredScreenView}
    ]
})

router.beforeEach((to) => {
    if(to.path === '/login' && player.value) {
        return '/game';
    }
    if (to.path === '/game' && !player.value) {
    return '/login';
    }
    if(to.path === '/game' && player.value?.retired) {
        return '/retired';
    }
    if(to.path === '/retired' && !player.value) {
        return '/login'
    }
});

export default router;
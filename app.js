const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

createApp({
  setup() {
    if (!localStorage.getItem('legalAgentUser')) {
      // Allow browsing workbench in demo; still prefer login
    }
    const pressedRoute = ref('');
    const showAccountMenu = ref(false);
    const showGuide = ref(false);
    const helpVideoUrl = ref('./static/tutorials/demo.mp4');
    const currentUser = ref(LegalDemo.readUser());
    const greeting = computed(() => LegalDemo.greeting());
    const initials = computed(() => LegalDemo.initials(currentUser.value.displayName));

    function logout() {
      LegalDemo.logout();
    }

    function navigateModule(route) {
      if (pressedRoute.value) return;
      pressedRoute.value = route;
      const target =
        route === 'regulation-compare.html'
          ? './regulation-compare.html#/breakdown'
          : `./${route}`;
      setTimeout(() => {
        location.href = target;
      }, 150);
    }

    function onKeydown(event) {
      if (event.key !== 'Escape') return;
      showAccountMenu.value = false;
      showGuide.value = false;
    }

    onMounted(() => addEventListener('keydown', onKeydown));
    onBeforeUnmount(() => removeEventListener('keydown', onKeydown));

    return {
      pressedRoute,
      showAccountMenu,
      showGuide,
      helpVideoUrl,
      currentUser,
      greeting,
      initials,
      logout,
      navigateModule
    };
  }
}).mount('#app');

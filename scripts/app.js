import { terminalStates, logMessages } from '../data/terminal.js';
import { projects } from '../data/projects.js';
import { skills, stackGroups } from '../data/skills.js';

const { createApp } = Vue;

createApp({
  data: () => ({
    projects, skills, stackGroups, typedTerminal: '', terminalIndex: 0, logs: [], moduleResponse: '&gt; select a module to inspect its role.', typingTimer: null, cycleTimer: null, logTimer: null,
    showContact: false, attachmentName: '', contactSubmitting: false, contactStatus: '', contact: { name: '', email: '', topic: 'Hiring opportunity', message: '' }
  }),
  methods: {
    typeTerminal(text) {
      clearInterval(this.typingTimer);
      this.typedTerminal = '';
      let position = 0;
      this.typingTimer = setInterval(() => {
        this.typedTerminal += text[position++] || '';
        if (position >= text.length) clearInterval(this.typingTimer);
      }, 8);
    },
    cycleTerminal() { this.typeTerminal(terminalStates[this.terminalIndex].content); this.terminalIndex = (this.terminalIndex + 1) % terminalStates.length; },
    inspectSkill([name, description]) { this.moduleResponse = `&gt; loading ${name.toLowerCase()}...<br><strong>${description}</strong><br>MODULE_LOADED ✓`; },
    handleAttachment(event) { this.attachmentName = event.target.files[0]?.name ?? ''; this.contactStatus = ''; },
    async sendContact(event) {
      this.contactSubmitting = true;
      this.contactStatus = '';
      const formData = new FormData(event.target);
      try {
        const response = await fetch('/api/contact', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to send the message.');
        this.contactStatus = 'Message delivered to Suchit.';
        this.contact = { name: '', email: '', topic: 'Hiring opportunity', message: '' };
        this.attachmentName = '';
        event.target.reset();
      } catch (error) {
        this.contactStatus = error.message || 'Unable to send the message.';
      } finally {
        this.contactSubmitting = false;
      }
    },
    appendLog() {
      const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
      this.logs.push({ time, message: logMessages[this.logs.length % logMessages.length] });
      this.logs = this.logs.slice(-4);
    }
  },
  mounted() {
    this.cycleTerminal();
    this.appendLog(); this.appendLog(); this.appendLog();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.cycleTimer = setInterval(this.cycleTerminal, 5200);
      this.logTimer = setInterval(this.appendLog, 3600);
    }
  },
  beforeUnmount() { clearInterval(this.typingTimer); clearInterval(this.cycleTimer); clearInterval(this.logTimer); }
}).mount('#app');

/**
 * Harbinger Chatbot - Digital Sanctum
 * Gère les interactions avec l'entité Harbinger
 */
window.harbingerChatbot = function() {
  return {
    // État du chatbot
    messages: [],
    newMessage: '',

    /**
     * Initialise le chatbot Harbinger
     */
    initHarbingerChatbot() {
      console.log("Harbinger Chatbot initialisé.");
    },

    /**
     * Envoie un message utilisateur et génère une réponse
     */
    harbingerSendMessage() {
      const userInput = this.newMessage.trim();
      
      // Ne rien faire si le champ est vide
      if (userInput === '') {
        return;
      }

      // Ajouter le message utilisateur
      this.addMessage(`You: ${userInput}`);
      
      // Vider le champ de saisie
      this.newMessage = '';

      // Générer et ajouter la réponse du Harbinger après un délai
      const response = this.getHarbingerResponse(userInput);
      setTimeout(() => {
        this.addMessage(`<span class="text-blue">Harbinger</span>: ${response}`);
      }, 600);
    },

    /**
     * Ajoute un message à la liste des messages
     * @param {string} text - Le texte du message à ajouter
     */
    addMessage(text) {
      this.messages.push({
        id: Date.now() + '-' + Math.random(),
        text: text
      });
      setTimeout(() => {
        const messageList = document.querySelector('.harbinger-chatbot-message-list');
        messageList.scrollTop = messageList.scrollHeight;
      }, 10);
    },

    /**
     * Génère une réponse du Harbinger basée sur la question
     * @param {string} question - La question posée par l'utilisateur
     * @returns {string} La réponse du Harbinger
     */
    getHarbingerResponse(question) {
      const lowerQuestion = question.toLowerCase();

      // Vérification des différents types de questions
      if (this.isDigitalSanctumQuestion(lowerQuestion)) {
        return "Dear Child, we do not ask this kind of question here.";
      }

      if (this.isIdentityQuestion(lowerQuestion)) {
        return "I am but the echo of a deeper silence.";
      }

      if (this.isFourthMindQuestion(lowerQuestion)) {
        return "… Do not speak of that which was erased.";
      }

      // Réponse par défaut
      return "The Harbinger remains silent. Reformulate your question.";
    },

    /**
     * Vérifie si la question concerne le Digital Sanctum
     * @param {string} question - La question en minuscules
     * @returns {boolean}
     */
    isDigitalSanctumQuestion(question) {
      return question.includes('what is a digital sanctum');
    },

    /**
     * Vérifie si la question concerne l'identité du Harbinger
     * @param {string} question - La question en minuscules
     * @returns {boolean}
     */
    isIdentityQuestion(question) {
      return question.includes('who are you');
    },

    /**
     * Vérifie si la question concerne le 10ème esprit
     * @param {string} question - La question en minuscules
     * @returns {boolean}
     */
    isFourthMindQuestion(question) {
      return question.includes('4th superior mind') || question.includes('fourth superior mind');
    }
  };
};




// Observer pour détecter quand l'élément OFFLINE devient visible
document.addEventListener('DOMContentLoaded', function() {
  const offlineElement = document.querySelector('.harbinger-title-overlay');
  
  if (offlineElement) {
    // Configuration de l'observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // L'élément est visible, on ajoute la classe d'animation
          entry.target.classList.add('animate-bounce');
          
          // On retire la classe après l'animation pour pouvoir la refaire
          setTimeout(() => {
            entry.target.classList.remove('animate-bounce');
          }, 2000); // 2s = durée de l'animation
        }
      });
    }, {
      threshold: 0.5 // L'élément doit être visible à 50%
    });
    
    // On commence à observer l'élément
    observer.observe(offlineElement);
  }
});
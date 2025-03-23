document.addEventListener("DOMContentLoaded", () => {
  // Subfiltros para cada plataforma
  const filtros = {
    pc: [],
    playstation: ["Tendencias", "Más vendidos", "Tarjetas regalo"],
    xbox: ["Tendencias", "Más vendidos", "Reservas", "Tarjetas regalo", "Suscripciones"],
    nintendo: ["Tendencias", "Más vendidos", "Reservas", "Tarjetas regalo", "Suscripciones"],
  };

  const ordenarPor = [
    { label: "Tendencias", value: "popularity" },
    { label: "Más vendidos", value: "best-selling" },
    { label: "Reservas", value: "release-date" },
    { label: "Tarjetas regalo", value: "gift-cards" },
    { label: "Suscripciones", value: "subscriptions" },
  ];

  document.getElementById("pc").addEventListener("click", () => mostrarSubfiltros("pc"));
  document.getElementById("playstation").addEventListener("click", () => mostrarSubfiltros("playstation"));
  document.getElementById("xbox").addEventListener("click", () => mostrarSubfiltros("xbox"));
  document.getElementById("nintendo").addEventListener("click", () => mostrarSubfiltros("nintendo"));

  document.getElementById("search-icon").addEventListener("click", () => toggleSearch());
  document.getElementById("close-search").addEventListener("click", () => {
    document.getElementById("search-container").style.display = "none";
    document.getElementById("search-suggestions").style.display = "none";
  });

  document.getElementById("advanced-search-btn").addEventListener("click", async () => {
    const query = document.getElementById("advanced-query").value.trim();
    const type = document.getElementById("search-type").value;
    const minPrice = document.getElementById("min-price").value;
    const maxPrice = document.getElementById("max-price").value;
    const instock = document.getElementById("instock").checked ? 1 : 0;
    const gameType = document.getElementById("game-type").value;

    const advancedParams = { query, type, minPrice, maxPrice, instock, gameType };
    const results = await window.electron.scrapeData({ query: advancedParams.query });
    mostrarResultados(results);
  });

  function mostrarSubfiltros(consola) {
    const subfiltrosConsolaDiv = document.getElementById("subfiltros-consola");
    const subfiltrosOrdenacionDiv = document.getElementById("subfiltros-ordenacion");
    subfiltrosConsolaDiv.innerHTML = "";
    subfiltrosOrdenacionDiv.innerHTML = "";

    filtros[consola].forEach(subfiltro => {
      const button = document.createElement("button");
      button.innerText = subfiltro;
      button.addEventListener("click", () => buscarPorConsola(consola, subfiltro));
      subfiltrosConsolaDiv.appendChild(button);
    });

    ordenarPor.forEach(opcion => {
      if (
        !filtros[consola].includes(opcion.label) &&
        !(consola === "playstation" && (opcion.label === "Reservas" || opcion.label === "Suscripciones"))
      ) {
        const button = document.createElement("button");
        button.innerText = opcion.label;
        button.addEventListener("click", () => ordenarResultados(consola, opcion.value));
        subfiltrosOrdenacionDiv.appendChild(button);
      }
    });
  }

  async function buscarPorConsola(consola, subfiltro) {
    const opcion = ordenarPor.find(o => o.label.toLowerCase() === subfiltro.toLowerCase());
    const ordenValue = opcion ? opcion.value : null;
    const params = ordenValue ? { consola, orden: ordenValue } : { consola };
    const results = await window.electron.scrapeData(params);
    mostrarResultados(results);
  }

  async function ordenarResultados(consola, orden) {
    const results = await window.electron.scrapeData({ consola, orden });
    mostrarResultados(results);
  }

  function mostrarResultados(results) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = results
      .map(item => {
        const title = item.title || "Título no disponible";
        const price = item.price || "Precio no disponible";
        const discount = item.discount || "Descuento no disponible";
        const link = item.link || "#";

        return `
          <div class="result-item">
            <div class="media-container">
              ${item.image ? `<img src="${item.image}" alt="${title}" class="media-image">` : ''}
              ${item.video ? `
                <video class="media-video" muted loop playsinline>
                  <source src="${item.video}" type="video/mp4">
                </video>` : ''}
            </div>
            <h3>${title}</h3>
            <p>Precio: ${price}</p>
            <p>Descuento: ${discount}</p>
            <a href="${link}" target="_blank">Ver más</a>
          </div>
        `;
      })
      .join("");

    document.querySelectorAll('.result-item').forEach(item => {
      const video = item.querySelector('.media-video');
      const img = item.querySelector('.media-image');

      if (video) {
        item.addEventListener('mouseenter', () => {
          img.style.opacity = '0';
          video.style.display = 'block';
          video.play().catch(error => {});
        });

        item.addEventListener('mouseleave', () => {
          img.style.opacity = '1';
          video.style.display = 'none';
          video.pause();
          video.currentTime = 0;
        });
      }
    });
  }

  function toggleSearch() {
    const searchContainer = document.getElementById("search-container");
    if (!searchContainer.style.display || searchContainer.style.display === "none") {
      searchContainer.style.display = "flex";
    } else {
      searchContainer.style.display = "none";
    }
  }

  function showSearchSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById("search-suggestions");
    suggestionsContainer.innerHTML = suggestions
      .map(item => `<div class="suggestion">${typeof item === "object" ? JSON.stringify(item) : item}</div>`)
      .join('');
    suggestionsContainer.style.display = "block";
    document.querySelectorAll(".suggestion").forEach(suggestion => {
      suggestion.addEventListener("click", () => {
        window.open(suggestion.innerText, "_blank");
        suggestionsContainer.style.display = "none";
      });
    });
  }
}); // ← AQUÍ se cierra el bloque del DOMContentLoaded


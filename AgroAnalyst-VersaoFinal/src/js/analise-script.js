document.addEventListener('DOMContentLoaded', () => {
    // --- Seleção dos Elementos ---
    const ctxChuva = document.getElementById('grafico-chuva')?.getContext('2d');
    const logo = document.getElementById('area-logo');
    const cadastrar = document.getElementById('cadastro');
    const login = document.getElementById('login');
    const botao = document.getElementById("botao-analisar-solo");
    const inputCidade = document.getElementById("input-cidade");

    const estadoSpan = document.getElementById("estado");
    const cidadeSpan = document.getElementById("cidade");
    const regiaoSpan = document.getElementById("regiao");
    const tipoSoloSpan = document.getElementById("tipo-solo");
    const climaSpan = document.getElementById("clima");
    const texturaSpan = document.getElementById("textura");
    const drenagemSpan = document.getElementById("drenagem");
    const phSpan = document.getElementById("ph");
    const fertilidadeSpan = document.getElementById("fertilidade");

    let mapa;
    let marcador;
    let coordenadasSelecionadas = null;
    let graficoChuva;

    // --- Listeners de Navegação ---
    if (cadastrar) {
        cadastrar.addEventListener('click', () => {
            location.href = "/AgroAnalyst-VersaoFinal/src/paginas/cadastro_login/cadastro.html";
        });
    }

    if (login) {
        login.addEventListener('click', () => {
            location.href = "/AgroAnalyst-VersaoFinal/src/paginas/cadastro_login/login.html";
        });
    }

    if (logo) {
        logo.addEventListener('click', () => {
            location.href = "/AgroAnalyst-VersaoFinal/index.html";
        });
    }

    // --- Inicialização do Gráfico ---
    if (ctxChuva) {
        graficoChuva = new Chart(ctxChuva, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Precipitação (mm)',
                    data: [120, 110, 95, 85, 70, 60, 55, 65, 80, 100, 115, 125],
                    backgroundColor: '#2f6c2f',
                    borderRadius: 10,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { color: '#333', font: { size: 14 } } },
                    tooltip: { callbacks: { label: context => `${context.parsed.y} mm` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Milímetros (mm)', color: '#333', font: { size: 14 } }, ticks: { color: '#333' } },
                    x: { ticks: { color: '#333' } }
                }
            }
        });
    }

    // --- Inicialização do Mapa ---
    function inicializarMapa() {
        mapa = L.map('mapa-interativo').setView([-14.235, -51.9253], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapa);
      
        // Evento de clique no mapa para obter coordenadas e preencher o input
        mapa.on('click', async function(e) {
            coordenadasSelecionadas = e.latlng;
            atualizarMapa(coordenadasSelecionadas.lat, coordenadasSelecionadas.lng);
            
            // Busca dados da cidade a partir das coordenadas
            const geocodingUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordenadasSelecionadas.lat}&lon=${coordenadasSelecionadas.lng}`;
            try {
                const resposta = await fetch(geocodingUrl);
                const dados = await resposta.json();

                if (dados.address) {
                    const cidade = dados.address.city || dados.address.town || dados.address.village || "";
                    const estado = dados.address.state || "";
                    inputCidade.value = `${cidade}, ${estado}`;
                    
                    // Atualiza os spans de exibição
                    estadoSpan.textContent = estado;
                    cidadeSpan.textContent = cidade;
                    regiaoSpan.textContent = obterRegiaoPorSigla(dados.address.state_code || dados.address.state || "");

                    // NOVO: Chama a função de análise de solo automaticamente após obter o endereço
                    analisarSolo();
                }
            } catch (error) {
                console.error("Erro ao buscar a cidade para a localização selecionada:", error);
            }
        });
    }

    inicializarMapa();
    
    // --- Lógica de Análise (Botão Principal) ---
    if (botao) {
        botao.addEventListener("click", () => {
            const cepInput = inputCidade.value.trim();
            const ehCepValido = /^\d{5}-?\d{3}$/.test(cepInput);

            if (ehCepValido) {
                buscarPorCep(cepInput);
            } else if (coordenadasSelecionadas) {
                analisarSolo();
            } else {
                alert("Por favor, digite um CEP válido ou clique no mapa para selecionar uma localização.");
            }
        });
    }

    // --- Funções de Lógica ---
    
    // Busca por CEP e atualiza o mapa e as informações
    async function buscarPorCep(cep) {
        const cepLimpo = cep.replace("-", "");
        try {
            const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const dados = await resposta.json();

            if (dados.erro) {
                alert("CEP não encontrado.");
                return;
            }

            // Atualiza os spans de exibição
            const siglaUf = dados.uf;
            const nomeEstado = obterEstadoPorExtenso(siglaUf);
            const regiao = obterRegiaoPorSigla(siglaUf);
            estadoSpan.textContent = nomeEstado;
            cidadeSpan.textContent = dados.localidade;
            regiaoSpan.textContent = regiao;

            const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dados.localidade)}+${encodeURIComponent(dados.uf)}&format=json&limit=1`;
            const geoResposta = await fetch(geocodingUrl);
            const geoDados = await geoResposta.json();

            if (geoDados.length > 0) {
                const lat = geoDados[0].lat;
                const lon = geoDados[0].lon;
                coordenadasSelecionadas = { lat: parseFloat(lat), lng: parseFloat(lon) };
                atualizarMapa(lat, lon);
                analisarSolo();
            } else {
                alert("Não foi possível encontrar coordenadas para este CEP.");
            }
        } catch (erro) {
            alert("Erro ao buscar o CEP. Tente novamente.");
            console.error(erro);
        }
    }

    // Atualiza o mapa com a nova localização
    function atualizarMapa(lat, lon) {
        if (marcador) {
            mapa.removeLayer(marcador);
        }
        mapa.setView([lat, lon], 12); 
        marcador = L.marker([lat, lon]).addTo(mapa);
    }
    
    // Análise do solo com base nas coordenadas
    // Análise do solo com base nas coordenadas
    // Análise do solo com base nas coordenadas
  async function analisarSolo() {
      if (!coordenadasSelecionadas) {
          alert("Localização não selecionada.");
          return;
      }

      const lat = coordenadasSelecionadas.lat;
      const lng = coordenadasSelecionadas.lng;
      
      // Mostra o spinner e esconde o gráfico
      const spinner = document.getElementById('loading-spinner');
      const grafico = document.getElementById('grafico-chuva');
      spinner.style.display = 'flex';
      grafico.style.display = 'none';

      try {
          const url = `https://meteoserver-stfv.onrender.com/chuva?lat=${lat}&lon=${lng}`;
          const resposta = await fetch(url);
          const dados = await resposta.json();

          if (resposta.ok) {
              // Atualiza os spans de solo com os dados do servidor
              if (dados.solo) {
                  tipoSoloSpan.textContent = dados.solo.tipo_solo;
                  climaSpan.textContent = dados.solo.clima_predominante;
                  texturaSpan.textContent = dados.solo.caracteristicas_solo.textura;
                  drenagemSpan.textContent = dados.solo.caracteristicas_solo.drenagem;
                  phSpan.textContent = dados.solo.caracteristicas_solo.pH;
                  fertilidadeSpan.textContent = dados.solo.caracteristicas_solo.fertilidade;
              } else {
                  tipoSoloSpan.textContent = "Não encontrado";
                  climaSpan.textContent = "Não encontrado";
                  texturaSpan.textContent = "Não encontrado";
                  drenagemSpan.textContent = "Não encontrado";
                  phSpan.textContent = "Não encontrado";
                  fertilidadeSpan.textContent = "Não encontrado";
              }

              // Atualiza o gráfico de chuvas com os dados do servidor
              const dadosChuva = dados.soma_chuva_mensal.sort((a,b) => a.mes - b.mes).map(m => m.soma_mm);
              const labelsChuva = dados.soma_chuva_mensal.sort((a,b) => a.mes - b.mes).map(m => m.nome_mes);
              
              graficoChuva.data.labels = labelsChuva;
              graficoChuva.data.datasets[0].data = dadosChuva;
              graficoChuva.update();
              
          } else {
              alert(`Erro do servidor: ${dados.erro || 'Dados não encontrados.'}`);
          }
      } catch (error) {
          alert("Erro ao conectar com o servidor. Verifique a sua internet.");
          console.error("Erro na requisição ao servidor:", error);
      } finally {
          // Esconde o spinner e mostra o gráfico
          spinner.style.display = 'none';
          grafico.style.display = 'block';
      }
  }
    
    // --- Funções de Apoio ---
    function obterEstadoPorExtenso(uf) {
        const estados = {
            AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
            ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
            PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
            RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins"
        };
        return estados[uf] || "Estado desconhecido";
    }

    function obterRegiaoPorSigla(uf) {
        const regioes = {
            Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
            Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
            CentroOeste: ["DF", "GO", "MT", "MS"],
            Sudeste: ["ES", "MG", "RJ", "SP"],
            Sul: ["PR", "RS", "SC"]
        };
        for (const [regiao, siglas] of Object.entries(regioes)) {
            if (siglas.includes(uf)) return regiao;
        }
        return "Região desconhecida";
    }
});
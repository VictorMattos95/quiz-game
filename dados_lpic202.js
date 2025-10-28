// Conteúdo do arquivo: dados_lpic202.js

const quizData = [
  {
    "id": 1,
    "pergunta": "Qual serviço é a principal implementação do protocolo SMB/CIFS no Linux, usado para interoperabilidade com o Windows?",
    "opcoes": {
      "A": "NFS (Network File System)",
      "B": "Apache",
      "C": "Samba",
      "D": "OpenLDAP"
    },
    "respostaCorreta": "C",
    "explicacao": "O Samba é o conjunto de aplicativos que implementa o protocolo SMB/CIFS, permitindo o compartilhamento de arquivos e impressoras com clientes Windows."
  },
  {
    "id": 2,
    "pergunta": "Qual é o arquivo de configuração principal do Samba?",
    "opcoes": {
      "A": "/etc/samba/samba.conf",
      "B": "/etc/smb.conf",
      "C": "/usr/local/samba/smb.conf",
      "D": "/etc/samba.conf"
    },
    "respostaCorreta": "B",
    "explicacao": "Embora algumas compilações possam usar locais diferentes, o local padrão e mais comum para o arquivo de configuração principal do Samba é /etc/smb.conf."
  },
  {
    "id": 3,
    "pergunta": "Qual comando é usado para verificar a sintaxe do arquivo de configuração do Samba antes de reiniciar o serviço?",
    "tipo": "fill",
    "respostaCorreta": "testparm",
    "explicacao": "O utilitário 'testparm' verifica o arquivo smb.conf em busca de erros de sintaxe e exibe a configuração processada."
  },
  {
    "id": 4,
    "pergunta": "Qual serviço de rede é um sistema de arquivos distribuído nativo do Unix/Linux?",
    "opcoes": {
      "A": "SMB",
      "B": "CIFS",
      "C": "NFS",
      "D": "AFP"
    },
    "respostaCorreta": "C",
    "explicacao": "NFS (Network File System) é o protocolo padrão em sistemas Unix-like para compartilhamento de arquivos em rede."
  }
];
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const FileUpload: React.FC = () => {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const files = fileInput.current?.files;
    if (!files || files.length < 1 || files.length > 6) {
      setError('Selecione entre 1 e 6 arquivos JSON.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    try {
      const res = await axios.post('http://localhost:3001/api/upload-multiplos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('allStats', JSON.stringify(res.data.allStats));
      navigate('/graficos-comparativos');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao enviar arquivos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tooltipStyle = {
    position: 'absolute' as 'absolute',
    backgroundColor: '#333',
    color: '#fff',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    width: '350px',
    zIndex: 100,
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    lineHeight: '1.5',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px'
  };

  const infoIconStyle = {
    display: 'inline-block',
    marginLeft: '8px',
    backgroundColor: '#3498db',
    color: 'white',
    borderRadius: '50%',
    width: '25px',
    height: '25px',
    textAlign: 'center' as 'center',
    fontWeight: 'bold' as 'bold',
    cursor: 'pointer',
    fontSize: '17px',
    position: 'relative' as 'relative'
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>
        Enviar arquivos JSON do iperf3
        <span 
          style={infoIconStyle} 
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          ?
          {showTooltip && (
            <div style={tooltipStyle}>
              <strong>Informações sobre as métricas disponíveis dos arquivos .json gerados pelo iperf3:</strong>
              <ul style={{ paddingLeft: '15px', margin: '5px 0' }}>
                <li style={{ marginBottom: '5px' }}>
                  <strong>TCP:</strong> Fornece taxa de transferência, latência (RTT), retransmissões e bytes enviados. 
                  Não disponibiliza jitter ou porcentagem de perda de pacotes.
                </li>
                <li style={{ marginBottom: '5px' }}>
                  <strong>UDP:</strong> Fornece taxa de transferência, pacotes enviados, perda de pacotes e jitter. 
                  Não disponibiliza latência (RTT).
                </li>
              </ul>
              <div style={{ marginTop: '5px', fontSize: '13px' }}>
                Ao comparar testes TCP e UDP, algumas métricas podem aparecer como N/A.
              </div>
            </div>
          )}
        </span>
      </h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".json" ref={fileInput} multiple />
        <button type="submit" disabled={loading} style={{ marginLeft: 10 }}>
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}

      <div style={{ marginTop: 20, fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
        <p>
          Faça upload de arquivos JSON gerados pelo iperf3 para visualizar e comparar métricas de desempenho de rede.
          <br />
          Você pode enviar até 6 arquivos simultaneamente.
        </p>
      </div>
    </div>
  );
};
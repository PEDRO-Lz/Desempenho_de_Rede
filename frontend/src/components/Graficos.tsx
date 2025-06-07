import React, { useEffect, useState, type JSX } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
} from 'recharts';
import './Graficos.css';

interface IntervalData {
    intervalEndSeconds: number;
    throughput: number;
    jitter?: number | null;
    latency?: number | null;
    retransmits?: number | null;
}

interface SummaryData {
    fileName: string;
    protocol: 'TCP' | 'UDP';
    dateTime: string;
    durationSeconds: number;
    totalLostPackets?: number | null;
    finalThroughput: number;
    finalJitter?: number | null;
    finalLatency?: number | null;
    totalSentPackets?: number | null;
    totalSentBytes?: number | null;
}

interface ParsedIperfData {
    summary: SummaryData;
    intervalsForGraph: IntervalData[];
}

const lineColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#FF69B4', '#FF4500', '#2E8B57'];

const formatThroughput = (bits: number | null | undefined) => {
    if (bits === null || bits === undefined) return null;
    return parseFloat((bits / 1_000_000).toFixed(2));
};

const formatValueTwoDecimals = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return parseFloat(value.toFixed(2));
};

const formatBytes = (bytes: number | null | undefined, decimals = 2) => {
    if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const prepareLineChartData = (
    allStats: ParsedIperfData[],
    metricExtractor: (interval: IntervalData) => number | null | undefined,
    valueFormatter: (value: number) => number | null = (v) => v
) => {
    if (!allStats || allStats.length === 0) return [];
    const timePoints = new Set<number>();
    allStats.forEach(stat => {
        stat.intervalsForGraph.forEach(interval => {
            timePoints.add(interval.intervalEndSeconds);
        });
    });
    const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
    return sortedTimePoints.map(time => {
        const dataPoint: { time: number;[fileName: string]: number | null } = { time };
        allStats.forEach(stat => {
            const interval = stat.intervalsForGraph.find(i => i.intervalEndSeconds === time);
            const rawValue = interval ? metricExtractor(interval) : null;
            dataPoint[stat.summary.fileName] = rawValue !== null && rawValue !== undefined ? valueFormatter(rawValue) : null;
        });
        return dataPoint;
    });
};

const prepareBarChartData = (
    allStats: ParsedIperfData[],
    metricExtractor: (summary: SummaryData) => number | null | undefined,
) => {
    if (!allStats || allStats.length === 0) return [];
    return allStats
        .map(stat => ({
            name: stat.summary.fileName,
            value: metricExtractor(stat.summary) ?? null,
        }))
        .filter(item => item.value !== null);
};

const hasValidLineData = (data: Array<{ time: number;[key: string]: number | null }>): boolean => {
    if (!data || data.length === 0) return false;
    return data.some(d => Object.keys(d).filter(key => key !== 'time').some(fileKey => d[fileKey] !== null && d[fileKey] !== undefined));
};

const renderInPairsWithPlaceholders = (chartElements: (JSX.Element | null)[]) => {
    const validCharts = chartElements.filter(Boolean) as JSX.Element[];
    const result: JSX.Element[] = [];

    for (let i = 0; i < validCharts.length; i += 2) {
        result.push(validCharts[i]);

        if (i + 1 < validCharts.length) {
            result.push(validCharts[i + 1]);
        } else {
            const placeholderKey = `placeholder_for_${validCharts[i].key || `chart_${i}`}_partner`;
            result.push(<div className="chart-wrapper chart-placeholder" key={placeholderKey}></div>);
        }
    }
    return result;
};


export const GraficosComparativos: React.FC = () => {
    const [allStats, setAllStats] = useState<ParsedIperfData[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedStats = localStorage.getItem('allStats');
            if (storedStats) {
                const parsedData = JSON.parse(storedStats) as ParsedIperfData[];
                if (Array.isArray(parsedData) && parsedData.length > 0) {
                    setAllStats(parsedData);
                } else {
                    setError("Nenhum dado de estatística encontrado ou formato inválido.");
                }
            } else {
                setError("Nenhum dado de estatística encontrado no localStorage.");
            }
        } catch (e) {
            console.error("Erro ao parsear dados do localStorage:", e);
            setError("Erro ao carregar dados. Tente reenviar os arquivos.");
        }
    }, []);

    const handleGoBack = () => {
        window.history.back();
    };

    if (error) {
        return (
            <div className="graficos-page error-message">
                <button onClick={handleGoBack} className="back-button back-button-absolute">
                    &larr; Voltar
                </button>
                {error}
            </div>
        );
    }

    if (allStats.length === 0 && !error) {
        return (
            <div className="graficos-page">
                <button onClick={handleGoBack} className="back-button back-button-absolute">
                    &larr; Voltar
                </button>
                Carregando dados ou nenhum dado disponível...
            </div>
        );
    }

    const throughputData = prepareLineChartData(allStats, (i) => i.throughput, formatThroughput);
    const latencyData = prepareLineChartData(allStats, (i) => i.latency, formatValueTwoDecimals);

    const lostPacketsData = prepareBarChartData(allStats, (s) => s.totalLostPackets);
    const sentPacketsUDPData = prepareBarChartData(allStats, (s) => s.protocol === 'UDP' ? s.totalSentPackets : null);
    const sentBytesTCPData = prepareBarChartData(allStats, (s) => s.protocol === 'TCP' ? s.totalSentBytes : null);
    const finalJitterUDPData = prepareBarChartData(
        allStats,
        (s) => (s.protocol === 'UDP' && s.finalJitter !== null && s.finalJitter !== undefined ? s.finalJitter : null),
    );

    const showThroughputChart = hasValidLineData(throughputData);
    const showLatencyChart = hasValidLineData(latencyData) && allStats.some(s => s.summary.protocol === 'TCP');
    const showLostPacketsChart = lostPacketsData.length > 0;
    const showSentPacketsUDPChart = sentPacketsUDPData.length > 0;
    const showSentBytesTCPChart = sentBytesTCPData.length > 0;
    const showFinalJitterUDPChart = finalJitterUDPData.length > 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const sortedPayload = [...payload].sort((a, b) => {
                if (a.value === null || a.value === undefined) return 1;
                if (b.value === null || b.value === undefined) return -1;
                return b.value - a.value;
            });
            return (
                <div className="custom-tooltip">
                    <p className="label">{`Tempo: ${label}s`}</p>
                    {sortedPayload.map((pld: any, index: number) => {
                        let valueDisplay;
                        if (pld.value === null || pld.value === undefined) {
                            valueDisplay = 'N/A';
                        } else {
                            valueDisplay = Number.isInteger(pld.value) ? pld.value.toString() : pld.value.toFixed(2);
                        }
                        return (<p key={index} style={{ color: pld.color }}>{`${pld.name}: ${valueDisplay}`}</p>);
                    })}
                </div>
            );
        }
        return null;
    };

    const CustomBarTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="label">{`${label}`}</p>
                    {payload.map((pld: any, index: number) => {
                        let valueDisplay;
                        if (pld.value === null || pld.value === undefined) {
                            valueDisplay = 'N/A';
                        } else if (pld.name === "Bytes Enviados") {
                            valueDisplay = formatBytes(pld.value);
                        } else if (pld.name === "Jitter Final") {
                            valueDisplay = `${formatValueTwoDecimals(pld.value)} ms`;
                        } else {
                            valueDisplay = pld.value;
                        }
                        const color = pld.payload && pld.payload.fill ? pld.payload.fill : pld.fill;
                        return (<p key={index} style={{ color: color }}>{`${pld.name}: ${valueDisplay}`}</p>);
                    })}
                </div>
            );
        }
        return null;
    };

    const throughputChartJSX = showThroughputChart ? (
        <div className="chart-wrapper" key="throughput-chart">
            <h3>Taxa de Transferência (Mbps)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={throughputData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" unit="s" stroke="black" />
                    <YAxis stroke="black" label={{ value: 'Mbps', angle: -90, position: 'insideLeft', fill: 'black' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {allStats.map((stat, index) => (
                        <Line key={stat.summary.fileName} type="monotone" dataKey={stat.summary.fileName} name={stat.summary.fileName} stroke={lineColors[index % lineColors.length]} connectNulls={false} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const latencyChartJSX = showLatencyChart ? (
        <div className="chart-wrapper" key="latency-chart">
            <h3>Latência/RTT (ms) (TCP)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" unit="s" stroke="black" />
                    <YAxis stroke="black" label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: 'black' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {allStats.filter(stat => stat.summary.protocol === 'TCP').map((stat) => {
                        const originalIndex = allStats.findIndex(s => s.summary.fileName === stat.summary.fileName);
                        return (
                            <Line key={stat.summary.fileName} type="monotone" dataKey={stat.summary.fileName} name={stat.summary.fileName} stroke={lineColors[originalIndex % lineColors.length]} connectNulls={false} />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const lostPacketsChartJSX = showLostPacketsChart ? (
        <div className="chart-wrapper" key="lostpackets-chart">
            <h3>Perda de Pacotes / Retransmissões</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lostPacketsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="black" />
                    <YAxis stroke="black" allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Perda/Retransmissões" >
                        {lostPacketsData.map((entry, barIndex) => {
                            const originalStatIndex = allStats.findIndex(s => s.summary.fileName === entry.name);
                            const colorIndex = originalStatIndex !== -1 ? originalStatIndex : barIndex;
                            return <Cell key={`cell-lost-${barIndex}`} fill={lineColors[colorIndex % lineColors.length]} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const finalJitterUDPChartJSX = showFinalJitterUDPChart ? (
        <div className="chart-wrapper" key="finaljitter-chart">
            <h3>Jitter (ms) (UDP)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={finalJitterUDPData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="black" />
                    <YAxis stroke="black" label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: 'black' }} tickFormatter={(value) => {
                        const formatted = formatValueTwoDecimals(value);
                        return formatted !== null && formatted !== undefined ? formatted.toString() : '';
                    }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Jitter Final" >
                        {finalJitterUDPData.map((entry, barIndex) => {
                            const originalStatIndex = allStats.findIndex(s => s.summary.fileName === entry.name && s.summary.protocol === 'UDP');
                            const colorIndex = originalStatIndex !== -1 ? originalStatIndex : barIndex;
                            return <Cell key={`cell-final-jitter-udp-${barIndex}`} fill={lineColors[colorIndex % lineColors.length]} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const sentPacketsUDPChartJSX = showSentPacketsUDPChart ? (
        <div className="chart-wrapper" key="sentpackets-udp-chart">
            <h3>Pacotes Enviados (UDP)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentPacketsUDPData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="black" />
                    <YAxis stroke="black" allowDecimals={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Pacotes Enviados" >
                        {sentPacketsUDPData.map((entry, barIndex) => {
                            const originalStatIndex = allStats.findIndex(s => s.summary.fileName === entry.name);
                            const colorIndex = originalStatIndex !== -1 ? originalStatIndex : barIndex;
                            return <Cell key={`cell-sent-udp-${barIndex}`} fill={lineColors[colorIndex % lineColors.length]} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const sentBytesTCPChartJSX = showSentBytesTCPChart ? (
        <div className="chart-wrapper" key="sentbytes-tcp-chart">
            <h3>Bytes Enviados (TCP)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sentBytesTCPData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="black" />
                    <YAxis stroke="black" tickFormatter={(value) => formatBytes(value, 0)} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Bytes Enviados" >
                        {sentBytesTCPData.map((entry, barIndex) => {
                            const originalStatIndex = allStats.findIndex(s => s.summary.fileName === entry.name);
                            const colorIndex = originalStatIndex !== -1 ? originalStatIndex : barIndex;
                            return <Cell key={`cell-sent-tcp-bytes-${barIndex}`} fill={lineColors[colorIndex % lineColors.length]} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    ) : null;

    const allChartElements = [
        throughputChartJSX,
        latencyChartJSX,
        sentPacketsUDPChartJSX,
        lostPacketsChartJSX,
        finalJitterUDPChartJSX,
        sentBytesTCPChartJSX
    ].filter(Boolean) as JSX.Element[];


    return (
        <div className="graficos-page">
            <button onClick={handleGoBack} className="back-button back-button-mainpage">
                &larr; Voltar para a página anterior
            </button>
            <h1>Análise de Desempenho iperf3</h1>

            {allChartElements.length > 0 && <h2 className="section-title">Gráficos</h2>}

            {allChartElements.length > 0 && (
                <div className="charts-container">
                    {renderInPairsWithPlaceholders(allChartElements)}
                </div>
            )}

            {allStats.length > 0 && <h2 className="section-title">Tabelas</h2>}
            <div className="tables-container">
                {allStats.map((stat, index) => (
                    <div key={index} className="table-wrapper">
                        <h4>{stat.summary.fileName}</h4>
                        <table className="summary-table">
                            <tbody>
                                <tr><th>Protocolo</th><td>{stat.summary.protocol}</td></tr>
                                <tr><th>Data e Hora</th><td>{new Date(stat.summary.dateTime).toLocaleString()}</td></tr>
                                <tr><th>Duração</th><td>{stat.summary.durationSeconds}s</td></tr>
                                <tr>
                                    <th>{stat.summary.protocol === 'TCP' ? 'Retransmissões' : 'Perda Total Pacotes'}</th>
                                    <td>{stat.summary.totalLostPackets ?? 'N/A'}</td>
                                </tr>
                                <tr><th>Taxa de Transferência</th><td>{formatThroughput(stat.summary.finalThroughput) ?? 'N/A'} Mbps</td></tr>
                                {stat.summary.protocol === 'UDP' && (
                                    <tr><th>Jitter</th><td>{stat.summary.finalJitter !== null && stat.summary.finalJitter !== undefined ? `${formatValueTwoDecimals(stat.summary.finalJitter)} ms` : 'N/A'}</td></tr>
                                )}
                                {stat.summary.protocol === 'TCP' && (
                                    <tr><th>Latência (RTT)</th><td>{stat.summary.finalLatency !== null && stat.summary.finalLatency !== undefined ? `${formatValueTwoDecimals(stat.summary.finalLatency)} ms` : 'N/A'}</td></tr>
                                )}
                                {stat.summary.protocol === 'UDP' && (
                                    <tr><th>Pacotes Enviados</th><td>{stat.summary.totalSentPackets ?? 'N/A'}</td></tr>
                                )}
                                {stat.summary.protocol === 'TCP' && (
                                    <tr><th>Bytes Enviados</th><td>{formatBytes(stat.summary.totalSentBytes) ?? 'N/A'}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
};
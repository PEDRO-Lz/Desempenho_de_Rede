interface IperfStreamSenderTCP {
  rtt?: number;
  retransmits?: number;
  [key: string]: any;
}

interface IperfStreamSum {
  bits_per_second: number;
  jitter_ms?: number;
  end: number;
  retransmits?: number;
  [key: string]: any;
}

interface IperfIntervalStream {
  sender?: IperfStreamSenderTCP;
  rtt?: number;
  retransmits?: number;
  [key: string]: any;
}

interface IperfInterval {
  streams: IperfIntervalStream[];
  sum: IperfStreamSum;
}

interface IperfEndStreamSenderTCP {
  mean_rtt?: number;
  [key: string]: any;
}

interface IperfEndStreamData {
  sender?: IperfEndStreamSenderTCP;
  udp?: {
    bits_per_second: number;
    jitter_ms?: number;
    lost_packets?: number;
    packets?: number;
    bytes?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

interface IperfEndSumTCP {
  bits_per_second: number;
  retransmits?: number;
  bytes?: number;
  [key: string]: any;
}

interface IperfEndSumUDP {
    bits_per_second: number;
    jitter_ms?: number;
    lost_packets?: number;
    packets?: number;
    bytes?: number;
    [key: string]: any;
}


interface IperfJson {
  start: {
    timestamp: {
      time: string;
    };
    test_start: {
      protocol: 'TCP' | 'UDP';
      duration: number;
    };
    [key: string]: any;
  };
  intervals: IperfInterval[];
  end: {
    streams: IperfEndStreamData[];
    sum_sent?: IperfEndSumTCP;
    sum_received?: IperfEndSumTCP;
    sum?: IperfEndSumUDP;
    [key: string]: any;
  };
}

export interface IntervalData {
  intervalEndSeconds: number;
  throughput: number;
  jitter?: number | null;
  latency?: number | null;
  retransmits?: number | null;
}

export interface SummaryData {
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

export interface ParsedIperfData {
  summary: SummaryData;
  intervalsForGraph: IntervalData[];
}

export const parseIperf = (jsonData: IperfJson, fileName: string): ParsedIperfData => {
  const protocol = jsonData.start.test_start.protocol;
  const durationSeconds = jsonData.start.test_start.duration;

  const summary: SummaryData = {
    fileName: fileName,
    protocol: protocol,
    dateTime: jsonData.start.timestamp.time,
    durationSeconds: durationSeconds,
    totalLostPackets: null,
    finalThroughput: 0,
    finalJitter: null,
    finalLatency: null,
    totalSentPackets: null,
    totalSentBytes: null,
  };

  const intervalsForGraph: IntervalData[] = [];
  const addedGraphPoints = new Set<number>();

  if (jsonData.intervals && jsonData.intervals.length > 0) {
    const firstInterval = jsonData.intervals[0];
    const initialData: IntervalData = {
      intervalEndSeconds: 0,
      throughput: firstInterval.sum.bits_per_second,
      jitter: null,
      latency: null,
      retransmits: null,
    };
    if (protocol === 'UDP') {
      initialData.jitter = firstInterval.sum.jitter_ms ?? null;
    } else if (protocol === 'TCP') {
      const rttValue = firstInterval.streams[0]?.rtt ?? firstInterval.streams[0]?.sender?.rtt;
      if (rttValue !== undefined) {
        initialData.latency = rttValue / 1000;
      }
      initialData.retransmits = firstInterval.sum.retransmits ?? firstInterval.streams[0]?.sender?.retransmits ?? firstInterval.streams[0]?.retransmits ?? null;
    }
    intervalsForGraph.push(initialData);
    addedGraphPoints.add(0);
  }

  for (const interval of jsonData.intervals) {
    const intervalEndSec = Math.round(interval.sum.end);

    if (intervalEndSec % 2 === 0 && intervalEndSec > 0 && intervalEndSec <= durationSeconds) {
      if (!addedGraphPoints.has(intervalEndSec)) {
        const graphData: IntervalData = {
          intervalEndSeconds: intervalEndSec,
          throughput: interval.sum.bits_per_second,
          jitter: null,
          latency: null,
          retransmits: null,
        };

        if (protocol === 'UDP') {
          graphData.jitter = interval.sum.jitter_ms ?? null;
        } else if (protocol === 'TCP') {
          const rttValue = interval.streams[0]?.rtt ?? interval.streams[0]?.sender?.rtt;
          if (rttValue !== undefined) {
            graphData.latency = rttValue / 1000;
          }
          graphData.retransmits = interval.sum.retransmits ?? interval.streams[0]?.sender?.retransmits ?? interval.streams[0]?.retransmits ?? null;
        }
        intervalsForGraph.push(graphData);
        addedGraphPoints.add(intervalEndSec);
      }
    }
  }
  intervalsForGraph.sort((a, b) => a.intervalEndSeconds - b.intervalEndSeconds);

  if (protocol === 'UDP') {
    if (jsonData.end.sum) {
      summary.finalThroughput = jsonData.end.sum.bits_per_second ?? 0;
      summary.finalJitter = jsonData.end.sum.jitter_ms ?? null;
      summary.totalLostPackets = jsonData.end.sum.lost_packets ?? null;
      summary.totalSentPackets = jsonData.end.sum.packets ?? null;
      summary.totalSentBytes = jsonData.end.sum.bytes ?? null;
    }
    summary.finalLatency = null;
  } else if (protocol === 'TCP') {
    if (jsonData.end.sum_sent) {
      summary.finalThroughput = jsonData.end.sum_sent.bits_per_second ?? 0;
      summary.totalLostPackets = jsonData.end.sum_sent.retransmits ?? null;
      summary.totalSentBytes = jsonData.end.sum_sent.bytes ?? null;
    }
    if (jsonData.end.streams && jsonData.end.streams.length > 0 && jsonData.end.streams[0].sender) {
      summary.finalLatency = jsonData.end.streams[0].sender.mean_rtt !== undefined ?
                              jsonData.end.streams[0].sender.mean_rtt / 1000 : null;
    }
    summary.finalJitter = null;
    summary.totalSentPackets = null;
  }

  return {
    summary,
    intervalsForGraph,
  };
};
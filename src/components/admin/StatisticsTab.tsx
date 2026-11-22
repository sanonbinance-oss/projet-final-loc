import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { RefreshCw, BarChart3, ArrowUpRight, Download } from 'lucide-react';
import { AdminTab, Payment, Student } from '../../types';
import { SyncService, SyncState } from '../../services/sync';
import { PaymentService } from '../../services/paymentService';

interface StatisticsTabProps {
  students: Student[];
  payments: Payment[];
  onRefreshData: () => void;
  onNavigateToTab: (tab: AdminTab) => void;
}

type CycleFilter = 'ALL' | 'COLLEGE' | 'LYCEE' | 'TECHNIQUE';
type PeriodFilter = '14D' | '30D' | 'ALL';

interface ClassRecoveryRow {
  classe: string;
  cycle: Exclude<CycleFilter, 'ALL'>;
  effectif: number;
  soldes: number;
  partiels: number;
  impayes: number;
  exigible: number;
  recouvre: number;
  enAttente: number;
  reste: number;
  taux: number;
}

interface DailyPoint {
  date: Date;
  dateKey: string;
  label: string;
  dailyAmount: number;
  dailyCount: number;
  cumulativeAmount: number;
  cumulativeRate: number;
}

interface ChannelStat {
  mode: string;
  label: string;
  color: string;
  amount: number;
  count: number;
  share: number;
}

const CLASS_ORDER = [
  '6ème',
  '5ème',
  '4ème',
  '3ème',
  '2nde A',
  '2nde C',
  '1ère A',
  '1ère D',
  'Tle A',
  'Tle D',
  'BEP 1',
  'BEP 2',
  'Bac Pro 1',
  'Bac Pro 2',
  "C'",
  "D'",
];

function classifyCycle(classe: string): Exclude<CycleFilter, 'ALL'> {
  const c = classe.trim().toLowerCase();
  if (c.includes('6') || c.includes('5') || c.includes('4') || c.includes('3')) {
    return 'COLLEGE';
  }
  if (c.includes('bep') || c.includes('bac pro') || c === "c'" || c === "d'") {
    return 'TECHNIQUE';
  }
  return 'LYCEE';
}

function getRateColor(rate: number): string {
  if (rate >= 75) return '#059669'; // emerald-600
  if (rate >= 40) return '#D97706'; // amber-600
  return '#DC2626'; // red-600
}

function getRateBadgeLabel(rate: number): string {
  if (rate >= 75) return 'Optimal';
  if (rate >= 40) return 'En progression';
  return 'Prioritaire';
}

function formatFcfaShort(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return String(Math.round(val));
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState<number>(640);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    update();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);

  return width;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  students,
  payments,
  onRefreshData,
  onNavigateToTab,
}) => {
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30D');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(() => SyncService.getState());

  // Tooltip states
  const [donutTooltip, setDonutTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    amount: number;
    percent: string;
  } | null>(null);

  const [barTooltip, setBarTooltip] = useState<{
    x: number;
    y: number;
    row: ClassRecoveryRow;
  } | null>(null);

  const [timelineTooltip, setTimelineTooltip] = useState<{
    x: number;
    y: number;
    point: DailyPoint;
  } | null>(null);

  const [channelTooltip, setChannelTooltip] = useState<{
    x: number;
    y: number;
    item: ChannelStat;
  } | null>(null);

  // SVG container refs
  const donutContainerRef = useRef<HTMLDivElement | null>(null);
  const donutSvgRef = useRef<SVGSVGElement | null>(null);

  const barContainerRef = useRef<HTMLDivElement | null>(null);
  const barSvgRef = useRef<SVGSVGElement | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineSvgRef = useRef<SVGSVGElement | null>(null);

  const channelContainerRef = useRef<HTMLDivElement | null>(null);
  const channelSvgRef = useRef<SVGSVGElement | null>(null);

  const barWidth = useContainerWidth(barContainerRef);
  const timelineWidth = useContainerWidth(timelineContainerRef);
  const channelWidth = useContainerWidth(channelContainerRef);
  const donutWidth = useContainerWidth(donutContainerRef);

  useEffect(() => {
    return SyncService.subscribe((next) => {
      setSyncState(next);
    });
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await SyncService.synchroniserMaintenant();
      onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeStudents = useMemo(
    () => students.filter((s) => s.statut !== 'radie'),
    [students]
  );

  const filteredStudents = useMemo(() => {
    if (cycleFilter === 'ALL') return activeStudents;
    return activeStudents.filter((s) => classifyCycle(s.classe) === cycleFilter);
  }, [activeStudents, cycleFilter]);

  const studentIdSet = useMemo(
    () => new Set(filteredStudents.map((s) => s.id)),
    [filteredStudents]
  );

  const filteredPayments = useMemo(() => {
    if (cycleFilter === 'ALL') return payments;
    return payments.filter(
      (p) => studentIdSet.has(p.studentId) || classifyCycle(p.studentClasse) === cycleFilter
    );
  }, [payments, cycleFilter, studentIdSet]);

  // Global metrics for current cycle filter
  const summary = useMemo(() => {
    const totalExigible = filteredStudents.reduce(
      (acc, s) => acc + Math.max(0, Number(s.scolariteTotale || 0)),
      0
    );
    const totalRecouvreScolarite = filteredStudents.reduce(
      (acc, s) =>
        acc +
        Math.min(
          Math.max(0, Number(s.scolariteTotale || 0)),
          Math.max(0, Number(s.montantPaye || 0))
        ),
      0
    );
    const totalPending = filteredPayments
      .filter((p) => p.statut === 'EN_ATTENTE_VERIFICATION')
      .reduce((acc, p) => acc + Number(p.montantScolarite || p.montant || 0), 0);

    const totalConfirmedPayments = filteredPayments
      .filter((p) => p.statut === 'SUCCES')
      .reduce((acc, p) => acc + Number(p.montant || 0), 0);

    const resteARecouvrer = Math.max(0, totalExigible - totalRecouvreScolarite);
    const tauxRecouvrement =
      totalExigible > 0 ? (totalRecouvreScolarite / totalExigible) * 100 : 0;

    const soldesCount = filteredStudents.filter(
      (s) => s.scolariteTotale > 0 && s.montantPaye >= s.scolariteTotale
    ).length;
    const partielsCount = filteredStudents.filter(
      (s) => s.montantPaye > 0 && s.montantPaye < s.scolariteTotale
    ).length;
    const impayesCount = filteredStudents.filter((s) => (s.montantPaye || 0) <= 0).length;

    return {
      totalExigible,
      totalRecouvreScolarite,
      totalPending,
      totalConfirmedPayments,
      resteARecouvrer,
      tauxRecouvrement,
      soldesCount,
      partielsCount,
      impayesCount,
      effectif: filteredStudents.length,
    };
  }, [filteredStudents, filteredPayments]);

  // Breakdown by class
  const classRows = useMemo<ClassRecoveryRow[]>(() => {
    const map = new Map<string, ClassRecoveryRow>();

    for (const st of filteredStudents) {
      const cls = st.classe || 'Non classé';
      const existing = map.get(cls) || {
        classe: cls,
        cycle: classifyCycle(cls),
        effectif: 0,
        soldes: 0,
        partiels: 0,
        impayes: 0,
        exigible: 0,
        recouvre: 0,
        enAttente: 0,
        reste: 0,
        taux: 0,
      };

      const due = Math.max(0, Number(st.scolariteTotale || 0));
      const paid = Math.min(due, Math.max(0, Number(st.montantPaye || 0)));

      existing.effectif += 1;
      existing.exigible += due;
      existing.recouvre += paid;
      if (due > 0 && paid >= due) existing.soldes += 1;
      else if (paid > 0) existing.partiels += 1;
      else existing.impayes += 1;

      map.set(cls, existing);
    }

    for (const p of filteredPayments) {
      if (p.statut !== 'EN_ATTENTE_VERIFICATION') continue;
      const cls = p.studentClasse || 'Non classé';
      const row = map.get(cls);
      if (row) {
        row.enAttente += Number(p.montantScolarite || p.montant || 0);
      }
    }

    const rows = Array.from(map.values()).map((r) => {
      const reste = Math.max(0, r.exigible - r.recouvre);
      const taux = r.exigible > 0 ? (r.recouvre / r.exigible) * 100 : 0;
      return { ...r, reste, taux };
    });

    rows.sort((a, b) => {
      const idxA = CLASS_ORDER.indexOf(a.classe);
      const idxB = CLASS_ORDER.indexOf(b.classe);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.classe.localeCompare(b.classe, 'fr');
    });

    return rows;
  }, [filteredStudents, filteredPayments]);

  // Daily cumulative recovery timeline
  const timelinePoints = useMemo<DailyPoint[]>(() => {
    const verified = filteredPayments
      .filter((p) => p.statut === 'SUCCES' && p.date)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (verified.length === 0) return [];

    const dailyMap = new Map<string, { date: Date; amount: number; count: number }>();
    for (const p of verified) {
      const d = new Date(p.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      const existing = dailyMap.get(key) || {
        date: new Date(`${key}T00:00:00`),
        amount: 0,
        count: 0,
      };
      existing.amount += Number(p.montantScolarite ?? p.montant ?? 0);
      existing.count += 1;
      dailyMap.set(key, existing);
    }

    const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let running = 0;
    const denom = summary.totalExigible > 0 ? summary.totalExigible : 1;

    const allPoints: DailyPoint[] = sortedDays.map(([key, item]) => {
      running += item.amount;
      return {
        date: item.date,
        dateKey: key,
        label: item.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        dailyAmount: item.amount,
        dailyCount: item.count,
        cumulativeAmount: running,
        cumulativeRate: summary.totalExigible > 0 ? Math.min(100, (running / denom) * 100) : 0,
      };
    });

    if (periodFilter === 'ALL') return allPoints;
    const days = periodFilter === '14D' ? 14 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const windowed = allPoints.filter((pt) => pt.date >= cutoff);
    return windowed.length > 0 ? windowed : allPoints.slice(-days);
  }, [filteredPayments, periodFilter, summary.totalExigible]);

  // Payment channel distribution
  const channelStats = useMemo<ChannelStat[]>(() => {
    const verified = filteredPayments.filter((p) => p.statut === 'SUCCES');
    const defs: Array<{ mode: string; label: string; color: string }> = [
      { mode: 'ESPECES_GUICHET', label: 'Espèces Guichet', color: '#059669' },
      { mode: 'ORANGE_MONEY', label: 'Orange Money', color: '#EA580C' },
      { mode: 'MOOV_MONEY', label: 'Moov Africa', color: '#0284C7' },
      { mode: 'MTN_MONEY', label: 'MTN Mobile Money', color: '#CA8A04' },
      { mode: 'LIGDICASH', label: 'LigdiCash', color: '#4F46E5' },
    ];
    const total = verified.reduce((acc, p) => acc + Number(p.montant || 0), 0);

    return defs
      .map((d) => {
        const subset = verified.filter((p) => p.mode === d.mode);
        const amount = subset.reduce((acc, p) => acc + Number(p.montant || 0), 0);
        return {
          mode: d.mode,
          label: d.label,
          color: d.color,
          amount,
          count: subset.length,
          share: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .filter((item) => item.amount > 0 || item.count > 0);
  }, [filteredPayments]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------------------
  // D3 CHART 1: Global Recovery Donut / Ring Gauge
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const svgEl = donutSvgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const size = Math.min(230, Math.max(180, donutWidth - 16));
    const radius = size / 2;
    const innerRadius = radius * 0.66;
    const outerRadius = radius * 0.92;

    svg.attr('width', size).attr('height', size).attr('viewBox', `0 0 ${size} ${size}`);

    const g = svg.append('g').attr('transform', `translate(${radius}, ${radius})`);

    const pendingCapped = Math.min(summary.resteARecouvrer, summary.totalPending);
    const remainingAfterPending = Math.max(0, summary.resteARecouvrer - pendingCapped);

    const slices =
      summary.totalExigible > 0
        ? [
            {
              key: 'recouvre',
              label: 'Encaissé confirmé',
              value: summary.totalRecouvreScolarite,
              color: '#059669',
            },
            {
              key: 'attente',
              label: 'Mobile Money en attente',
              value: pendingCapped,
              color: '#D97706',
            },
            {
              key: 'reste',
              label: 'Reste à recouvrer',
              value: remainingAfterPending,
              color: '#E2E8F0',
            },
          ].filter((s) => s.value > 0)
        : [{ key: 'empty', label: 'Aucune scolarité exigible', value: 1, color: '#E2E8F0' }];

    const pie = d3
      .pie<{ key: string; label: string; value: number; color: string }>()
      .sort(null)
      .padAngle(slices.length > 1 ? 0.025 : 0)
      .value((d) => d.value);

    const arc = d3
      .arc<d3.PieArcDatum<{ key: string; label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(4);

    const arcHover = d3
      .arc<d3.PieArcDatum<{ key: string; label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius + 5)
      .cornerRadius(4);

    const paths = g
      .selectAll('path')
      .data(pie(slices))
      .enter()
      .append('path')
      .attr('fill', (d) => d.data.color)
      .style('cursor', summary.totalExigible > 0 ? 'pointer' : 'default')
      .on('mouseenter', function (event, d) {
        if (summary.totalExigible <= 0) return;
        d3.select(this).transition().duration(140).attr('d', arcHover(d) || '');
        const rect = donutContainerRef.current?.getBoundingClientRect();
        const x = rect ? event.clientX - rect.left : radius;
        const y = rect ? event.clientY - rect.top : radius;
        const pct = ((d.data.value / summary.totalExigible) * 100).toFixed(1);
        setDonutTooltip({
          x,
          y,
          label: d.data.label,
          amount: d.data.value,
          percent: pct,
        });
      })
      .on('mousemove', function (event, d) {
        if (summary.totalExigible <= 0) return;
        const rect = donutContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = ((d.data.value / summary.totalExigible) * 100).toFixed(1);
        setDonutTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          label: d.data.label,
          amount: d.data.value,
          percent: pct,
        });
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this).transition().duration(140).attr('d', arc(d) || '');
        setDonutTooltip(null);
      });

    if (prefersReducedMotion) {
      paths.attr('d', (d) => arc(d) || '');
    } else {
      paths
        .transition()
        .duration(450)
        .ease(d3.easeCubicOut)
        .attrTween('d', function (d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return (t) => arc(interpolate(t)) || '';
        });
    }

    // Center percentage readout
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', '#0F172A')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '26px')
      .style('font-weight', '800')
      .text(`${summary.tauxRecouvrement.toFixed(1)}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', '#64748B')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text('recouvré');
  }, [donutWidth, summary, prefersReducedMotion]);

  // ---------------------------------------------------------------------------
  // D3 CHART 2: Class-by-Class Recovery Rate Horizontal Bar Chart
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const svgEl = barSvgRef.current;
    if (!svgEl || classRows.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(320, barWidth);
    const margin = { top: 14, right: 64, bottom: 30, left: 82 };
    const rowHeight = 34;
    const innerHeight = Math.max(140, classRows.length * rowHeight);
    const height = innerHeight + margin.top + margin.bottom;
    const innerWidth = Math.max(120, width - margin.left - margin.right);

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(classRows.map((r) => r.classe))
      .range([0, innerHeight])
      .padding(0.32);

    // Subtle vertical gridlines (25%, 50%, 75%, 100%)
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data([25, 50, 75, 100])
      .enter()
      .append('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    // Bottom X axis
    const xAxis = d3
      .axisBottom(x)
      .tickValues([0, 25, 50, 75, 100])
      .tickFormat((d) => `${d}%`)
      .tickSize(0);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight + 6})`)
      .call(xAxis)
      .call((axisG) => axisG.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px');

    // Left Y axis
    const yAxis = d3.axisLeft(y).tickSize(0);
    g.append('g')
      .call(yAxis)
      .call((axisG) => axisG.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#1E293B')
      .style('font-size', '12px')
      .style('font-weight', '600');

    const rowGroups = g
      .selectAll('.bar-row')
      .data(classRows)
      .enter()
      .append('g')
      .attr('class', 'bar-row')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedClass((prev) => (prev === d.classe ? null : d.classe));
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).select('.track-rect').attr('fill', '#E2E8F0');
        const rect = barContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setBarTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            row: d,
          });
        }
      })
      .on('mousemove', function (event, d) {
        const rect = barContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setBarTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            row: d,
          });
        }
      })
      .on('mouseleave', function (_event, d) {
        d3.select(this)
          .select('.track-rect')
          .attr('fill', selectedClass === d.classe ? '#E2E8F0' : '#F1F5F9');
        setBarTooltip(null);
      });

    // 100% Track background
    rowGroups
      .append('rect')
      .attr('class', 'track-rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.classe) || 0)
      .attr('width', innerWidth)
      .attr('height', y.bandwidth())
      .attr('rx', 5)
      .attr('fill', (d) => (selectedClass === d.classe ? '#E2E8F0' : '#F1F5F9'))
      .attr('stroke', (d) => (selectedClass === d.classe ? '#0F172A' : 'none'))
      .attr('stroke-width', 1.5);

    // Pending mobile money bar segment (stacked immediately after confirmed recovery)
    rowGroups
      .append('rect')
      .attr('x', (d) => x(Math.min(100, d.taux)))
      .attr('y', (d) => y(d.classe) || 0)
      .attr('width', (d) => {
        if (d.exigible <= 0 || d.enAttente <= 0) return 0;
        const pendingPct = (d.enAttente / d.exigible) * 100;
        const endPct = Math.min(100, d.taux + pendingPct);
        return Math.max(0, x(endPct) - x(Math.min(100, d.taux)));
      })
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', '#FCD34D');

    // Confirmed recovery bar
    const fillBars = rowGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.classe) || 0)
      .attr('height', y.bandwidth())
      .attr('rx', 5)
      .attr('fill', (d) => getRateColor(d.taux));

    if (prefersReducedMotion) {
      fillBars.attr('width', (d) => Math.max(0, x(Math.min(100, d.taux))));
    } else {
      fillBars
        .attr('width', 0)
        .transition()
        .duration(420)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => Math.max(0, x(Math.min(100, d.taux))));
    }

    // Percentage label on right
    rowGroups
      .append('text')
      .attr('x', innerWidth + 10)
      .attr('y', (d) => (y(d.classe) || 0) + y.bandwidth() / 2 + 4)
      .attr('fill', '#0F172A')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text((d) => `${d.taux.toFixed(0)}%`);
  }, [barWidth, classRows, selectedClass, prefersReducedMotion]);

  // ---------------------------------------------------------------------------
  // D3 CHART 3: Daily Collection & Cumulative Recovery Area/Line Chart
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const svgEl = timelineSvgRef.current;
    if (!svgEl || timelinePoints.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(320, timelineWidth);
    const height = 240;
    const margin = { top: 18, right: 20, bottom: 32, left: 56 };
    const innerWidth = Math.max(120, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const minDate = timelinePoints[0].date;
    const maxDate = timelinePoints[timelinePoints.length - 1].date;
    const xDomain: [Date, Date] =
      minDate.getTime() === maxDate.getTime()
        ? [new Date(minDate.getTime() - 86400000), new Date(maxDate.getTime() + 86400000)]
        : [minDate, maxDate];

    const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);
    const maxCumul = d3.max(timelinePoints, (d) => d.cumulativeAmount) || 1;
    const y = d3.scaleLinear().domain([0, maxCumul * 1.15]).nice().range([innerHeight, 0]);

    // Horizontal gridlines
    const yTicks = y.ticks(4);
    g.append('g')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3,3');

    const xAxis = d3
      .axisBottom(x)
      .ticks(Math.min(6, timelinePoints.length))
      .tickFormat((d) =>
        (d as Date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      )
      .tickSize(0);

    g.append('g')
      .attr('transform', `translate(0, ${innerHeight + 8})`)
      .call(xAxis)
      .call((axisG) => axisG.select('.domain').attr('stroke', '#CBD5E1'))
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-size', '11px');

    const yAxis = d3
      .axisLeft(y)
      .ticks(4)
      .tickFormat((d) => formatFcfaShort(Number(d)))
      .tickSize(0);

    g.append('g')
      .call(yAxis)
      .call((axisG) => axisG.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#64748B')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px');

    // Gradient fill for cumulative area
    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'edupay-recovery-area')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#059669').attr('stop-opacity', 0.24);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#059669').attr('stop-opacity', 0.02);

    const area = d3
      .area<DailyPoint>()
      .x((d) => x(d.date))
      .y0(innerHeight)
      .y1((d) => y(d.cumulativeAmount))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<DailyPoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.cumulativeAmount))
      .curve(d3.curveMonotoneX);

    g.append('path').datum(timelinePoints).attr('fill', 'url(#edupay-recovery-area)').attr('d', area);

    const pathLine = g
      .append('path')
      .datum(timelinePoints)
      .attr('fill', 'none')
      .attr('stroke', '#059669')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    if (!prefersReducedMotion) {
      const totalLen = pathLine.node()?.getTotalLength() || 0;
      if (totalLen > 0) {
        pathLine
          .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
          .attr('stroke-dashoffset', totalLen)
          .transition()
          .duration(500)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0);
      }
    }

    // Daily points
    g.selectAll('.dot-point')
      .data(timelinePoints)
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.cumulativeAmount))
      .attr('r', 4)
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#059669')
      .attr('stroke-width', 2);

    // Interactive crosshair + hover overlay
    const focusLine = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#94A3B8')
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const focusDot = g
      .append('circle')
      .attr('r', 6)
      .attr('fill', '#059669')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const bisect = d3.bisector<DailyPoint, Date>((d) => d.date).left;

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const hoveredDate = x.invert(mx);
        const idx = bisect(timelinePoints, hoveredDate, 1);
        const d0 = timelinePoints[idx - 1];
        const d1 = timelinePoints[idx];
        const pt =
          !d1 || (d0 && hoveredDate.getTime() - d0.date.getTime() < d1.date.getTime() - hoveredDate.getTime())
            ? d0
            : d1;
        if (!pt) return;

        const px = x(pt.date);
        const py = y(pt.cumulativeAmount);
        focusLine.attr('x1', px).attr('x2', px).style('opacity', 1);
        focusDot.attr('cx', px).attr('cy', py).style('opacity', 1);

        const rect = timelineContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setTimelineTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            point: pt,
          });
        }
      })
      .on('mouseleave', () => {
        focusLine.style('opacity', 0);
        focusDot.style('opacity', 0);
        setTimelineTooltip(null);
      });
  }, [timelineWidth, timelinePoints, prefersReducedMotion]);

  // ---------------------------------------------------------------------------
  // D3 CHART 4: Channel Mix Horizontal Stacked Bar + Breakdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const svgEl = channelSvgRef.current;
    if (!svgEl || channelStats.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(280, channelWidth);
    const margin = { top: 8, right: 64, bottom: 20, left: 120 };
    const rowH = 30;
    const innerHeight = Math.max(80, channelStats.length * rowH);
    const height = innerHeight + margin.top + margin.bottom;
    const innerWidth = Math.max(100, width - margin.left - margin.right);

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const y = d3
      .scaleBand<string>()
      .domain(channelStats.map((c) => c.label))
      .range([0, innerHeight])
      .padding(0.32);

    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call((axisG) => axisG.select('.domain').remove())
      .selectAll('text')
      .attr('fill', '#334155')
      .style('font-size', '11px')
      .style('font-weight', '600');

    const rows = g
      .selectAll('.ch-row')
      .data(channelStats)
      .enter()
      .append('g')
      .attr('class', 'ch-row')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const rect = channelContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setChannelTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            item: d,
          });
        }
      })
      .on('mousemove', (event, d) => {
        const rect = channelContainerRef.current?.getBoundingClientRect();
        if (rect) {
          setChannelTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            item: d,
          });
        }
      })
      .on('mouseleave', () => setChannelTooltip(null));

    rows
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.label) || 0)
      .attr('width', innerWidth)
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', '#F1F5F9');

    const bars = rows
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.label) || 0)
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => d.color);

    if (prefersReducedMotion) {
      bars.attr('width', (d) => x(d.share));
    } else {
      bars
        .attr('width', 0)
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr('width', (d) => x(d.share));
    }

    rows
      .append('text')
      .attr('x', innerWidth + 8)
      .attr('y', (d) => (y(d.label) || 0) + y.bandwidth() / 2 + 4)
      .attr('fill', '#0F172A')
      .style('font-family', "'JetBrains Mono', monospace")
      .style('font-size', '11px')
      .style('font-weight', '700')
      .text((d) => `${d.share.toFixed(0)}%`);
  }, [channelWidth, channelStats, prefersReducedMotion]);

  const handleExportCsv = () => {
    const header = [
      'Classe',
      'Cycle',
      'Effectif',
      'Soldes',
      'Partiels',
      'Impayes',
      'Exigible (FCFA)',
      'Recouvre (FCFA)',
      'En attente (FCFA)',
      'Reste (FCFA)',
      'Taux (%)',
    ].join(';');
    const lines = classRows.map((r) =>
      [
        r.classe,
        r.cycle,
        r.effectif,
        r.soldes,
        r.partiels,
        r.impayes,
        r.exigible,
        r.recouvre,
        r.enAttente,
        r.reste,
        r.taux.toFixed(1),
      ].join(';')
    );
    const csv = '\uFEFF' + [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques-recouvrement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Live Sync Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">
            Statistiques de Recouvrement des Frais de Scolarité
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncState.statut === 'erreur'
                    ? 'bg-red-500'
                    : syncState.estEnCours
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              {syncState.statut === 'erreur'
                ? 'Hors ligne'
                : syncState.estEnCours
                ? 'Actualisation...'
                : 'Temps réel actif'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Dernière synchro : {syncState.derniereSynchro || 'En cours'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{summary.effectif} élève(s) actif(s)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cycle Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'Toutes' },
                { id: 'COLLEGE', label: 'Collège' },
                { id: 'LYCEE', label: 'Lycée' },
                { id: 'TECHNIQUE', label: 'Technique' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setCycleFilter(opt.id);
                  setSelectedClass(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  cycleFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={classRows.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Synchro...' : 'Actualiser'}</span>
          </button>
        </div>
      </div>

      {/* Empty state if no students */}
      {activeStudents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Aucune donnée de scolarité à analyser
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Les graphiques D3 de recouvrement en temps réel apparaîtront dès qu&apos;un élève sera inscrit ou qu&apos;une demande d&apos;admission sera validée.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => onNavigateToTab('demandes')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Voir les Demandes
            </button>
            <button
              onClick={() => onNavigateToTab('eleves')}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Gérer les Élèves
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Taux de Recouvrement</p>
              <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {summary.tauxRecouvrement.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500">
                {summary.soldesCount} soldé(s) · {summary.partielsCount} partiel(s) · {summary.impayesCount} impayé(s)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Scolarités Encaissées</p>
              <p className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
                {summary.totalRecouvreScolarite.toLocaleString('fr-FR')} <span className="text-xs font-sans font-normal text-slate-500">FCFA</span>
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                Sur {summary.totalExigible.toLocaleString('fr-FR')} FCFA exigibles
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">En Attente Mobile Money</p>
              <p className="font-mono text-2xl font-extrabold text-amber-700 tabular-nums">
                {summary.totalPending.toLocaleString('fr-FR')} <span className="text-xs font-sans font-normal text-slate-500">FCFA</span>
              </p>
              <button
                onClick={() => onNavigateToTab('transactions')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Vérifier au journal</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Reste à Recouvrer</p>
              <p className="font-mono text-2xl font-extrabold text-slate-900 tabular-nums">
                {summary.resteARecouvrer.toLocaleString('fr-FR')} <span className="text-xs font-sans font-normal text-slate-500">FCFA</span>
              </p>
              <p className="text-xs text-slate-500">
                {summary.totalExigible > 0
                  ? `${((summary.resteARecouvrer / summary.totalExigible) * 100).toFixed(1)}% du budget attendu`
                  : 'Aucun solde exigible'}
              </p>
            </div>
          </div>

          {/* Row 1: Donut Gauge + Class Recovery Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* D3 Donut Chart */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Avancement Global
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Répartition entre montants encaissés, en attente et solde dû
                </p>
              </div>

              <div
                ref={donutContainerRef}
                className="relative flex items-center justify-center py-4"
              >
                <svg ref={donutSvgRef} className="overflow-visible" />
                {donutTooltip && (
                  <div
                    className="pointer-events-none absolute z-20 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap"
                    style={{
                      left: Math.min(donutWidth - 150, Math.max(8, donutTooltip.x + 12)),
                      top: Math.max(8, donutTooltip.y - 36),
                    }}
                  >
                    <div className="font-semibold">{donutTooltip.label}</div>
                    <div className="font-mono tabular-nums text-emerald-300 mt-0.5">
                      {donutTooltip.amount.toLocaleString('fr-FR')} FCFA ({donutTooltip.percent}%)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />
                    Encaissé confirmé
                  </span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {summary.totalRecouvreScolarite.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 shrink-0" />
                    En attente validation
                  </span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {summary.totalPending.toLocaleString('fr-FR')} F
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 shrink-0" />
                    Reste à recouvrer
                  </span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {summary.resteARecouvrer.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>
            </div>

            {/* D3 Class Recovery Horizontal Bars */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Taux de Recouvrement par Classe
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cliquez sur une barre pour filtrer le détail · Vert ≥ 75% · Orange 40–74% · Rouge &lt; 40%
                  </p>
                </div>
                {selectedClass && (
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
                  >
                    Réinitialiser ({selectedClass})
                  </button>
                )}
              </div>

              <div ref={barContainerRef} className="relative w-full flex-1 min-h-[180px]">
                {classRows.length > 0 ? (
                  <svg ref={barSvgRef} className="w-full block" />
                ) : (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                    Aucune classe dans ce cycle
                  </div>
                )}

                {barTooltip && (
                  <div
                    className="pointer-events-none absolute z-20 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap space-y-0.5"
                    style={{
                      left: Math.min(barWidth - 210, Math.max(8, barTooltip.x + 14)),
                      top: Math.max(4, barTooltip.y - 44),
                    }}
                  >
                    <div className="font-bold">
                      {barTooltip.row.classe} · {barTooltip.row.effectif} élève(s)
                    </div>
                    <div className="font-mono tabular-nums text-emerald-300">
                      Recouvré : {barTooltip.row.recouvre.toLocaleString('fr-FR')} F ({barTooltip.row.taux.toFixed(1)}%)
                    </div>
                    <div className="font-mono tabular-nums text-slate-300">
                      Reste : {barTooltip.row.reste.toLocaleString('fr-FR')} F
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Cumulative Timeline + Payment Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* D3 Area + Line Timeline */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Progression Cumulée des Encaissements
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Montant cumulé des scolarités confirmées par date de versement
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                  {(
                    [
                      { id: '14D', label: '14 j' },
                      { id: '30D', label: '30 j' },
                      { id: 'ALL', label: 'Tout' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPeriodFilter(p.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        periodFilter === p.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={timelineContainerRef} className="relative w-full flex-1 min-h-[240px]">
                {timelinePoints.length > 0 ? (
                  <svg ref={timelineSvgRef} className="w-full block" />
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Aucun paiement confirmé sur la période sélectionnée
                  </div>
                )}

                {timelineTooltip && (
                  <div
                    className="pointer-events-none absolute z-20 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap space-y-0.5"
                    style={{
                      left: Math.min(timelineWidth - 200, Math.max(8, timelineTooltip.x + 12)),
                      top: Math.max(6, timelineTooltip.y - 54),
                    }}
                  >
                    <div className="font-bold">{timelineTooltip.point.label}</div>
                    <div className="font-mono tabular-nums text-emerald-300">
                      Cumul : {timelineTooltip.point.cumulativeAmount.toLocaleString('fr-FR')} F ({timelineTooltip.point.cumulativeRate.toFixed(1)}%)
                    </div>
                    <div className="font-mono tabular-nums text-slate-300">
                      Jour : +{timelineTooltip.point.dailyAmount.toLocaleString('fr-FR')} F ({timelineTooltip.point.dailyCount} reçu(s))
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* D3 Channel Mix */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Répartition par Mode de Paiement
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Part des paiements confirmés ({summary.totalConfirmedPayments.toLocaleString('fr-FR')} FCFA)
                </p>
              </div>

              <div ref={channelContainerRef} className="relative w-full my-3 min-h-[140px]">
                {channelStats.length > 0 ? (
                  <svg ref={channelSvgRef} className="w-full block" />
                ) : (
                  <div className="h-36 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Aucun versement confirmé enregistré
                  </div>
                )}

                {channelTooltip && (
                  <div
                    className="pointer-events-none absolute z-20 bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap"
                    style={{
                      left: Math.min(channelWidth - 180, Math.max(8, channelTooltip.x + 12)),
                      top: Math.max(4, channelTooltip.y - 40),
                    }}
                  >
                    <div className="font-bold">{channelTooltip.item.label}</div>
                    <div className="font-mono tabular-nums text-emerald-300">
                      {channelTooltip.item.amount.toLocaleString('fr-FR')} FCFA · {channelTooltip.item.count} op.
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                {channelStats.map((c) => (
                  <div key={c.mode} className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      {PaymentService.getPaymentMethodLabel(c.mode as Payment['mode'])}
                    </span>
                    <span className="font-mono text-slate-800 font-semibold tabular-nums">
                      {c.amount.toLocaleString('fr-FR')} F · {c.count} op.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* High-Density Class Recovery Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Détail du Recouvrement par Classe
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedClass
                    ? `Classe sélectionnée : ${selectedClass}`
                    : `${classRows.length} classe(s) affichée(s)`}
                </p>
              </div>
              {selectedClass && (
                <button
                  onClick={() => setSelectedClass(null)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer self-start sm:self-auto"
                >
                  Afficher toutes les classes
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Classe</th>
                    <th className="py-2.5 px-3 text-right">Élèves</th>
                    <th className="py-2.5 px-3 text-right">Soldés / Part. / Imp.</th>
                    <th className="py-2.5 px-3 text-right">Exigible</th>
                    <th className="py-2.5 px-3 text-right">Recouvré</th>
                    <th className="py-2.5 px-3 text-right">Reste à percevoir</th>
                    <th className="py-2.5 px-4 text-right">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classRows
                    .filter((r) => !selectedClass || r.classe === selectedClass)
                    .map((r) => (
                      <tr
                        key={r.classe}
                        onClick={() =>
                          setSelectedClass((prev) => (prev === r.classe ? null : r.classe))
                        }
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {r.classe}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {r.effectif}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          {r.soldes} / {r.partiels} / {r.impayes}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {r.exigible.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {r.recouvre.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {r.reste.toLocaleString('fr-FR')} F
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span
                            className="font-mono tabular-nums font-bold"
                            style={{ color: getRateColor(r.taux) }}
                          >
                            {r.taux.toFixed(1)}%
                          </span>
                          <span className="text-slate-400 ml-1.5">· {getRateBadgeLabel(r.taux)}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

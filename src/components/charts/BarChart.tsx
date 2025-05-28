import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { EventData, YearlyCount } from '@/types'; 

function isEventDataArray(data: EventData[] | YearlyCount[]): data is EventData[] {
  // checj if the first element has a 'date' property,
  // and not present in YearlyCount. assume a non empty adrray
  return data.length > 0 && (data[0] as EventData).date !== undefined;
}

interface BarChartProps {
  data: EventData[] | YearlyCount[]; 
  width?: number;
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, width = 400, height = 300 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) {
      // clear previous chart if data is empty or ref is not available
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      return;
    }

    let processedData: YearlyCount[];

    if (isEventDataArray(data)) {
      const countsByYear = d3.rollup(
        data, 
        v => v.length, 
        d => {
          const parts = d.date.split(' ');
          return parts.length > 2 ? parts[parts.length - 1] : "Unknown"; 
        }
      );
      processedData = Array.from(countsByYear, ([year, count]) => ({ year, count }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year));
    } else {
      processedData = [...data].sort((a, b) => parseInt(String(a.year)) - parseInt(String(b.year)));
    }

    if (processedData.length === 0) {
        if (svgRef.current) {
            d3.select(svgRef.current).selectAll("*").remove();
            const svg = d3.select(svgRef.current)
                .attr('width', width)
                .attr('height', height);
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("No data for selected range.");
        }
        return;
    }
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#2d3748') 
      .style('color', 'white'); 

    // Clear previous chart elements
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(processedData.map(d => d.year))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.count) || 0])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X-axis
    const allYears = processedData.map(d => d.year);
    let tickValues = allYears;
    const maxTicks = Math.max(2, Math.floor(innerWidth / 50)); 

    if (allYears.length > maxTicks) {
      // if too many years elect a subset of ticks
      const nth = Math.ceil(allYears.length / maxTicks);
      tickValues = allYears.filter((_, i) => i % nth === 0);
    }
    // console.log('Calculated tickValues for X-Axis:', tickValues); 
    // console.log('xScale domain:', xScale.domain()); 

    const xAxis = d3.axisBottom(xScale)
      .tickValues(tickValues) 
      .tickFormat(() => ""); // using empty format as we set text manually below

    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll(".tick") 
      .select("text") 
      .text(d => String(d)); // d here is the year string from tickValues

    xAxisGroup.selectAll("text")
        .style("fill", "white")
        .style("font-size", "9px") 
        .attr("transform", "rotate(-35)") 
        .attr("text-anchor", "end")       
        .attr("dx", "-.8em")              
        .attr("dy", ".15em");
    
    // Y-axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll("text")
        .style("fill", "white"); 

    // bars
    g.selectAll('.bar')
      .data(processedData)
      .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.year) || 0)
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.count))
        .attr('fill', 'steelblue');

    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", height - margin.bottom / 2 + 10)
        .style("fill", "white")
        .style("font-size", "10px")
        .text("Year");

    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", margin.left / 2 - 10)
        .style("fill", "white")
        .style("font-size", "10px")
        .text("Number of Events");

  }, [data, width, height]); 

  return (
    <div className="bg-slate-700 p-4 rounded-md shadow-lg">
        <h4 className="text-md font-semibold text-slate-100 mb-2">Events per Year</h4>
        <svg ref={svgRef}></svg>
    </div>
  );
};

export default React.memo(BarChart);

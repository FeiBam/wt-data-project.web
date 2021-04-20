import * as d3 from "d3";
import { Plot } from "./plot";
import { TimeseriesData, TimeseriesRow } from "../data/timeseries-data";
import { categoricalColors, COLORS, utils } from "../utils";
import { BRRange, Measurement } from "../app/page/br-heatmap-page";
import { ColorBar } from "./color-bar";
import { BRLineChart, LineChartDataObj } from "./line-chart";

export class BrHeatmap extends Plot {
    colorBar: ColorBar;
    lineChart: BRLineChart;
    selected: Array<SquareInfo> = [];

    mouseoverEvent = function(): void {
        d3.select(this).style("stroke", "white");
    };

    mouseleaveEvent = function(): void {
        d3.select(this).style("stroke", "black");
    };

    getClickEvent(): () => void {
        const self = this;
        return function(): void {
            const square = d3.select(this);
            // @ts-ignore
            const info: SquareInfo = square.data()[0];

            if (utils.rgbToHex(square.style("fill")).toUpperCase() === COLORS.BLUE) {
                // if the square is selected
                square.style("fill", self.value2color(info.value));
                // remove the item in the `this.selected`
                self.selected = self.selected.filter(each => each.br !== info.br || each.nation !== info.nation);
            } else {
                // if the square is not selected
                square.style("fill", COLORS.BLUE);
                // add the item into the `this.selected`
                self.selected.push(info);
            }
            self.lineChart.update();
        }
    }

    cache: TimeseriesData;
    value2color: Value2Color;

    colorPool = {
        values: utils.deepCopy(categoricalColors),
        i: 0,

        bindings: new Array<{br: string, nation: string, color: string}>(),

        get: function(d: LineChartDataObj) {
            // if the category is generated before, use previous color
            for (const binding of this.bindings) {
                if (binding.br === d.br && binding.nation === d.nation) {
                    return binding.color;
                }
            }
            // else assign a new color to the nation
            const out = this.values[this.i];
            this.i++;
            if (this.i === this.values.length) {
                this.i = 0;
            }

            // add to binding
            this.bindings.push({
                nation: d.nation,
                br: d.br,
                color: out
            })
            return out;
        }
    }

    init(colorBar: ColorBar, lineChart: BRLineChart): BrHeatmap {
        this.colorBar = colorBar;
        this.lineChart = lineChart;

        // build new plot in the content div of page
        this.svg = d3.select("#content")
            .append("svg")
            .attr("height", this.svgHeight)
            .attr("width", this.svgWidth)
            .attr("id", "main-svg");
        this.g = this.svg.append("g")
            .attr("id", "main-g")
            .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);


        d3.csv(this.dataPath, (data: TimeseriesData) => {
            // init
            const dataObjs = this.extractData(data)
            const squareWidth = this.width / utils.nations.length;
            const squareHeight = this.height / utils.brs[this.brRange].length;
            // build axis
            const {x, y} = this.buildAxis();

            // init the colorbar and line chart
            this.colorBar.init();
            this.lineChart.init();

            // colorMap function
            this.value2color = this.getValue2color();

            // TODO: tooltip

            // add heat squares
            this.g.selectAll()
                .data(dataObjs)
                .enter()
                .append("rect")
                .attr("x", d => x(d.nation))
                .attr("y", d => y(d.br))
                .attr("width", squareWidth)
                .attr("height", squareHeight)
                .style("fill", d => this.value2color(d.value))
                .style("stroke-width", 1)
                .style("stroke", "black")
                .on("mouseover", this.mouseoverEvent)
                .on("mouseleave", this.mouseleaveEvent)
                .on("click", this.getClickEvent());

            this.cache = data;
        })
        return this;
    }

    update(reDownload: boolean): BrHeatmap {
        const oldAxis = d3.selectAll("g#br-heatmap-x, g#br-heatmap-y");

        if (reDownload) {
            // if need re-download data
            d3.csv(this.dataPath, (data: TimeseriesData) => {
                this.updateSquares(data)
                this.cache = data;
            })
        } else {
            // else read data from cache
            this.updateSquares(this.cache);
        }

        this.buildAxis();
        oldAxis.remove();
        return this;
    }

    private updateSquares(data: TimeseriesData) {
        // init
        const dataObjs = this.extractData(data)

        // colorMap function
        this.value2color = this.getValue2color();

        // change fill of squares
        const rects = this.g.selectAll("rect")
            .data(dataObjs);

        rects.enter()
            .transition()
            .style("fill", d => this.value2color(d.value));

        rects.exit()
            .transition()
            .style("fill", COLORS.BLANK);

        rects.transition()
            .style("fill", d => this.value2color(d.value));
    }

    private buildAxis() {
        // x-axis
        const x = d3.scaleBand()
            .range([0, this.width])
            .domain(utils.nations);

        this.g.append("g")
            .attr("id", "br-heatmap-x")
            .style("font-size", 13)
            .attr("transform", `translate(0, ${this.height + 10})`)
            .call(d3.axisBottom(x).tickSize(0))
            .select("#main-g g path.domain").remove()

        // y-axis
        const y = d3.scaleBand()
            .range([this.height, 0])
            .domain(utils.brs[this.brRange]);

        this.g.append("g")
            .attr("id", "br-heatmap-y")
            .style("font-size", 15)
            .attr("transform", `translate(-5, 0)`)
            .call(d3.axisLeft(y).tickSize(0))
            .select("#main-g g path.domain").remove()
        return {x, y};
    }

    private extractData(data: Array<TimeseriesRow>) {
        return data.filter(row => row.date === this.date && row.cls === this.clazz)
            .map(row => {
                return {
                    nation: row.nation,
                    br: this.getBr(row),
                    value: this.getValue(row)
                }
            });
    }

    getValue(row: TimeseriesRow): number {
        // @ts-ignore
        return row[`${this.mode}_${this.measurement}`]
    }

    getBr(row: TimeseriesRow): string {
        // @ts-ignore
        return row[`${this.mode}_br`]
    }

    private getValue2color(): Value2Color {
        let value2range: d3.ScaleLinear<number, number, never>;
        let range2color: d3.ScaleLinear<number, number, never>;
        let valueMin: number;
        let valueMax: number;

        switch (this.measurement) {
            case "win_rate":
                valueMin = 0;
                valueMax = 100;

                value2range = d3.scaleLinear()
                    .domain([valueMin, valueMax])
                    .range([0, 1]);

                if (this.clazz === "Ground_vehicles") {
                    range2color = d3.scaleLinear()
                        .domain([0, 0.05, 0.4, 0.5, 0.6, 0.95, 1.0])
                        // @ts-ignore
                        .range([COLORS.WHITE, COLORS.BLACK, COLORS.RED, COLORS.YELLOW, COLORS.GREEN, COLORS.BLACK, COLORS.BLACK])
                        // @ts-ignore
                        .interpolate(d3.interpolateHcl)
                } else if (this.clazz === "Aviation") {
                    range2color = d3.scaleLinear()
                        .domain([0, 0.01, 0.5, 0.6, 0.7, 0.99, 1.0])
                        // @ts-ignore
                        .range([COLORS.WHITE, COLORS.BLACK, COLORS.RED, COLORS.YELLOW, COLORS.GREEN, COLORS.BLACK, COLORS.BLACK])
                        // @ts-ignore
                        .interpolate(d3.interpolateHcl)
                }

                break;
            case "battles_sum":
                valueMin = Math.pow(10, 2.5);
                valueMax = Math.pow(10, 5.5);

                value2range = d3.scaleLog()
                    .domain([valueMin, valueMax])
                    .range([0, 1]);

                range2color = d3.scaleLinear()
                    .domain([0, 0.01, 0.4, 0.5, 0.6, 0.99, 1.0])
                    // @ts-ignore
                    .range([COLORS.WHITE, COLORS.BLACK, COLORS.RED, COLORS.YELLOW, COLORS.GREEN, COLORS.BLACK])
                    // @ts-ignore
                    .interpolate(d3.interpolateHcl)
                break;
        }

        const value2color = (value: number) => range2color(value2range(value));

        // update color bar
        this.colorBar.update(valueMin, valueMax, value2color);

        return (value: number) => {
            if (value == 0.) {
                return COLORS.BLANK;
            } else {
                return range2color(value2range(value));
            }
        }
    }


    get dataPath(): string {
        return `https://raw.githubusercontent.com/ControlNet/wt-data-project.data/master/${this.mode.toLowerCase()}_ranks_${this.brRange}.csv`
    }

    get date(): string {
        return utils.getSelectedValue("date-selection");
    }

    get clazz(): string {
        return utils.getSelectedValue("class-selection");
    }

    get mode(): string {
        return utils.getSelectedValue("mode-selection");
    }

    get measurement(): Measurement {
        return <Measurement>utils.getSelectedValue("measurement-selection");
    }

    get brRange(): BRRange {
        return <BRRange>utils.getSelectedValue("br-range-selection");
    }

}

interface SquareInfo {
    nation: string;
    br: string;
    value: number;
}

interface Value2Color {
    (value: number): number | COLORS
}
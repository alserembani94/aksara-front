import { Container, Dropdown, Hero, Section } from "@components/index";
import { FunctionComponent, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { numFormat, toDate } from "@lib/helpers";
import { useTranslation } from "next-i18next";
import { useSlice } from "@hooks/useSlice";
import { useData } from "@hooks/useData";
import type { OptionType } from "@components/types";
import { AKSARA_COLOR } from "@lib/constants";
import type { ChartDatasetProperties, ChartTypeRegistry } from "chart.js";
import Slider from "@components/Chart/Slider";
import { track } from "@lib/mixpanel";
import { routes } from "@lib/routes";

import InflationTrends from "./inflation-trends";
import InflationSnapshot from "./inflation-snapshot";

/**
 * Consumer Prices (CPI) Dashboard
 * @overview Status: Live
 */

interface TimeseriesChartData {
  title: string;
  unitY: string;
  label: string;
  data: number[];
  fill: boolean;
  callout: string;
  prefix?: string;
}

const Timeseries = dynamic(() => import("@components/Chart/Timeseries"), { ssr: false });
interface ConsumerPricesDashboardProps {
  last_updated: number;
  timeseries: any;
  timeseries_callouts: any;
}

const ConsumerPricesDashboard: FunctionComponent<ConsumerPricesDashboardProps> = ({
  last_updated,
  timeseries,
  timeseries_callouts,
}) => {
  const { t, i18n } = useTranslation();
  const INDEX_OPTIONS: Array<OptionType> = ["growth_yoy", "growth_mom", "value"].map(
    (key: string) => ({
      label: t(`consumer_prices.keys.${key}`),
      value: key,
    })
  );
  const SHADE_OPTIONS: Array<OptionType> = [
    { label: t("consumer_prices.keys.no_shade"), value: "no_shade" },
    { label: t("consumer_prices.keys.recession"), value: "recession" },
  ];

  const { data, setData } = useData({
    index_type: INDEX_OPTIONS[0],
    shade_type: SHADE_OPTIONS[0],
    minmax: [0, timeseries.data[INDEX_OPTIONS[0].value].x.length - 1],
  });
  const LATEST_TIMESTAMP =
    timeseries.data[data.index_type.value].x[timeseries.data[data.index_type.value].x.length - 1];
  const { coordinate } = useSlice(timeseries.data[data.index_type.value], data.minmax);

  const shader = useCallback<
    (key: string) => ChartDatasetProperties<keyof ChartTypeRegistry, any[]>
  >(
    (key: string) => {
      if (key === "no_shade")
        return {
          data: [],
        };

      return {
        type: "line",
        data: coordinate[key],
        backgroundColor: AKSARA_COLOR.BLACK_H,
        borderWidth: 0,
        fill: true,
        yAxisID: "y2",
        stepped: true,
      };
    },
    [data]
  );

  const configs = useCallback<(key: string) => { unit: string; callout: string; fill: boolean }>(
    (key: string) => {
      const unit = data.index_type.value === "value" ? "" : "%";
      const callout = [
        numFormat(timeseries_callouts.data[data.index_type.value][key].callout, "standard", [1, 1]),
        unit,
      ].join("");

      return {
        unit,
        callout,
        fill: data.shade_type.value === "no_shade",
      };
    },
    [data.index_type, data.shade_type]
  );

  const getChartData = (sectionHeaders: string[]): TimeseriesChartData[] =>
    sectionHeaders.map(chartName => ({
      title: t(`consumer_prices.keys.${chartName}`),
      unitY: configs(chartName).unit,
      label: t(`consumer_prices.keys.${chartName}`),
      data: coordinate[chartName],
      fill: configs(chartName).fill,
      callout: configs(chartName).callout,
    }));

  const section1ChartData = getChartData([
    "food_beverage",
    "alcohol_tobacco",
    "clothing_footwear",
    "housing_utilities",
    "furnishings",
    "health",
    "transport",
    "communication",
    "recreation_culture",
    "education",
    "hospitality",
    "misc",
  ]);

  useEffect(() => {
    track("page_view", {
      type: "dashboard",
      id: "consumer_prices.header",
      name_en: "Consumer Prices",
      name_bm: "Harga Pengguna",
      route: routes.CONSUMER_PRICES,
    });
  }, []);

  return (
    <>
      <Hero background="consumer-prices-banner">
        <div className="space-y-4 xl:w-2/3">
          <span className="text-sm font-bold uppercase tracking-widest text-green-700">
            {t("nav.megamenu.categories.economy")}
          </span>
          <h3>{t("consumer_prices.header")}</h3>
          <p className="text-dim">{t("consumer_prices.description")}</p>

          <p className="text-sm text-dim">
            {t("common.last_updated", {
              date: toDate(last_updated, "dd MMM yyyy, HH:mm", i18n.language),
            })}
          </p>
        </div>
      </Hero>

      <Container className="min-h-screen">
        {/* How is the CPI trending? */}
        <Section
          title={t("consumer_prices.section_1.title")}
          description={t("consumer_prices.section_1.description")}
          date={timeseries.data_as_of}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 lg:flex lg:flex-row">
              <Dropdown
                anchor="left"
                selected={data.index_type}
                options={INDEX_OPTIONS}
                onChange={e => setData("index_type", e)}
              />
              <Dropdown
                anchor="left"
                options={SHADE_OPTIONS}
                selected={data.shade_type}
                onChange={e => setData("shade_type", e)}
              />
            </div>

            <Slider
              type="range"
              value={data.minmax}
              data={timeseries.data[data.index_type.value].x}
              period="month"
              onChange={e => setData("minmax", e)}
            />
            <Timeseries
              title={t("consumer_prices.keys.overall")}
              className="h-[350px] w-full"
              interval="month"
              unitY={configs("overall").unit}
              displayNumFormat={value =>
                numFormat(value, "compact", [1, 1], "short", i18n.language, true)
              }
              axisY={{
                y2: {
                  display: false,
                  grid: {
                    drawTicks: false,
                    drawBorder: false,
                    lineWidth: 0.5,
                  },
                  ticks: {
                    display: false,
                  },
                },
              }}
              data={{
                labels: coordinate.x,
                datasets: [
                  {
                    type: "line",
                    data: coordinate.overall,
                    label: t("consumer_prices.keys.overall"),
                    borderColor: AKSARA_COLOR.TURQUOISE,
                    backgroundColor: AKSARA_COLOR.TURQUOISE_H,
                    borderWidth: 1.5,
                    fill: configs("overall").fill,
                  },
                  shader(data.shade_type.value),
                ],
              }}
              stats={[
                {
                  title: t("common.latest", {
                    date: toDate(LATEST_TIMESTAMP, "MMM yyyy", i18n.language),
                  }),
                  value: configs("overall").callout,
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              {section1ChartData.map(chartData => (
                <Timeseries
                  key={chartData.title}
                  title={chartData.title}
                  className="h-[350px] w-full"
                  interval="month"
                  displayNumFormat={value =>
                    numFormat(value, "compact", [1, 1], "short", i18n.language, true)
                  }
                  unitY={chartData.unitY}
                  axisY={{
                    y2: {
                      display: false,
                      grid: {
                        drawTicks: false,
                        drawBorder: false,
                        lineWidth: 0.5,
                      },
                      ticks: {
                        display: false,
                      },
                    },
                  }}
                  data={{
                    labels: coordinate.x,
                    datasets: [
                      {
                        type: "line",
                        label: chartData.label,
                        data: chartData.data,
                        borderColor: AKSARA_COLOR.GREY,
                        backgroundColor: AKSARA_COLOR.GREY_H,
                        fill: chartData.fill,
                        borderWidth: 1.5,
                      },
                      shader(data.shade_type.value),
                    ],
                  }}
                  stats={[
                    {
                      title: t("common.latest", {
                        date: toDate(LATEST_TIMESTAMP, "MMM yyyy", i18n.language),
                      }),
                      value: chartData.callout,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* Chart-builder: Inflation trends for specific items */}
        <Section
          title={t("consumer_prices.section_3.title")}
          description={t("consumer_prices.section_3.description")}
          date={timeseries.data_as_of}
        >
          <InflationTrends />
        </Section>

        {/* A granular snapshot of inflation in the Malaysian economy */}
        <Section
          title={t("consumer_prices.section_2.title")}
          description={t("consumer_prices.section_2.description")}
          date={timeseries.data_as_of}
        >
          <InflationSnapshot />
        </Section>
      </Container>
    </>
  );
};

export default ConsumerPricesDashboard;

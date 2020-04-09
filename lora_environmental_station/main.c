#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

#include "shell.h"
#include "saul.h"
#include "saul_reg.h"
#include "phydat.h"

#include "net/loramac.h"
#include "semtech_loramac.h"

#include "board.h"

/* Struct containing the sensors data. */
typedef struct sensors {
    int temperature;
    int humidity;
    int windDirection;
    int windIntensity;
    int rainHeight;
} sensors_t;


/* Declare globally the loramac descriptor */
semtech_loramac_t loramac;

/* Device and application informations required for OTAA activation */
static const uint8_t deveui[LORAMAC_DEVEUI_LEN] = { 0x00, 0x46, 0x06, 0x4E, 0x63, 0xA0, 0x16, 0x18 };
static const uint8_t appeui[LORAMAC_APPEUI_LEN] = { 0x70, 0xB3, 0xD5, 0x7E, 0xD0, 0x02, 0xD7, 0x98 };
static const uint8_t appkey[LORAMAC_APPKEY_LEN] = { 0xBB, 0x1D, 0x06, 0x97, 0xD6, 0x17, 0xBA, 0xAD, 0x57, 0xBD, 0x9D, 0xF4, 0xF5, 0xB9, 0x80, 0xC7 };


/* Function for generating random integer in [lower, upper]. */
static int rand_int(int lower, int upper) {
    return (rand() % (upper - lower + 1)) + lower;
}

/* Function for updating the sensor data. */
static void update_sensors(sensors_t *sensors) {
    saul_reg_t *temp_dev = saul_reg_find_type(SAUL_SENSE_TEMP);
    if (temp_dev == NULL) {
        sensors->temperature = rand_int(-50, 50);
    }
    else {
        phydat_t temp_data;
        saul_reg_read(temp_dev, &temp_data);
        float temp = (float) *temp_data.val;
        sensors->temperature = (int)round(temp/100);
    }

    saul_reg_t *hum_dev = saul_reg_find_type(SAUL_SENSE_HUM);
    if (hum_dev == NULL) {
        sensors->humidity = rand_int(0, 100);
    }
    else {
        phydat_t hum_data;
        saul_reg_read(hum_dev, &hum_data);
        float hum = (float) *hum_data.val;
        sensors->humidity = (int)round(hum/100);
    }

    sensors->windDirection = rand_int(0, 360);
    sensors->windIntensity = rand_int(0, 100);
    sensors->rainHeight = rand_int(0, 50);
}

/* Enviromental station shell command.
 * It takes in input the address and the port of the gateway,
 * the id of the station and the seconds to pass between each publish.
 * It regularly updates the sensor data and publishes it to the topic
 * stations/RiotOSEnvironmentalStation + the id of the station.
 */
static int cmd_env_station(int argc, char **argv) {
    if (argc < 2) {
        printf("usage: %s <seconds>\n", argv[0]);
        return 1;
    }

    /* initialize the loramac stack */
    semtech_loramac_init(&loramac);

    /* use a fast datarate so we don't use the physical layer too much */
    semtech_loramac_set_dr(&loramac, 5);

    /* set the LoRaWAN keys */
    semtech_loramac_set_deveui(&loramac, deveui);
    semtech_loramac_set_appeui(&loramac, appeui);
    semtech_loramac_set_appkey(&loramac, appkey);

    /* start the OTAA join procedure */
    puts("Starting join procedure");
    while (semtech_loramac_join(&loramac, LORAMAC_JOIN_OTAA) != SEMTECH_LORAMAC_JOIN_SUCCEEDED) {
        puts("Join procedure failed");
        xtimer_sleep(atoi(10));
        continue;
    }

    sensors_t sensors;
    char data[128];

    while (1) {
        update_sensors(&sensors);

        sprintf(data, "{\"temperature\": \"%d\", \"humidity\": \"%d\", "
                      "\"windDirection\": \"%d\", \"windIntensity\": \"%d\", "
                      "\"rainHeight\": \"%d\"}",
                      sensors.temperature, sensors.humidity,
                      sensors.windDirection, sensors.windIntensity,
                      sensors.rainHeight);

        uint8_t ret = semtech_loramac_send(&loramac, (uint8_t *)data,
                                           strlen(data));
        if (ret != SEMTECH_LORAMAC_TX_DONE && ret != SEMTECH_LORAMAC_TX_OK) {
            printf("Cannot send message '%s', ret code: %d\n", data, ret);
            xtimer_sleep(atoi(10));
            continue;
        }

        /* wait for any potentially received data */
        semtech_loramac_recv(&loramac);


        xtimer_sleep(atoi(argv[1]));
    }

    return 0;
}


static const shell_command_t shell_commands[] = {
    { "env_station", "Environmental station", cmd_env_station },
    { NULL, NULL, NULL }
};

int main(void) {
    /* Start shell */
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);

    /* Should be never reached */
    return 0;
}

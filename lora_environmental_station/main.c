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


static void string_to_hex_array(char *string, uint8_t *hex) {
    for (uint8_t i=0; i<strlen(string); i+=2){
        char temp[2];
        temp[0]=string[i];
        temp[1]=string[i+1];
        hex[i/2]=(int)strtol(temp, NULL, 16);
    }
}

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
    if (argc < 5) {
        printf("usage: %s <deveui> <appeui> <appkey> <seconds>\n", argv[0]);
        return 1;
    }

    /* initialize the loramac stack */
    semtech_loramac_init(&loramac);

    /* use a fast datarate so we don't use the physical layer too much */
    semtech_loramac_set_dr(&loramac, 5);

    /* set the LoRaWAN keys */
    uint8_t deveui[LORAMAC_DEVEUI_LEN];
    uint8_t appeui[LORAMAC_APPEUI_LEN];
    uint8_t appkey[LORAMAC_APPKEY_LEN];

    string_to_hex_array(argv[1], deveui);
    string_to_hex_array(argv[2], appeui);
    string_to_hex_array(argv[3], appkey);

    semtech_loramac_set_deveui(&loramac, deveui);
    semtech_loramac_set_appeui(&loramac, appeui);
    semtech_loramac_set_appkey(&loramac, appkey);

    /* start the OTAA join procedure */
    printf("Starting join procedure");
    while (semtech_loramac_join(&loramac, LORAMAC_JOIN_OTAA) != SEMTECH_LORAMAC_JOIN_SUCCEEDED) {
        printf("Join procedure failed");
        xtimer_sleep(10);
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
        if (ret == SEMTECH_LORAMAC_TX_DONE || ret == SEMTECH_LORAMAC_TX_OK) {
            printf("Successfully sent message '%s'\n", data);
        } else {
            printf("Cannot send message '%s', ret code: %d\n", data, ret);
            xtimer_sleep(10);
            continue;
        }

        /* wait for any potentially received data */
        semtech_loramac_recv(&loramac);


        xtimer_sleep(atoi(argv[4]));
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

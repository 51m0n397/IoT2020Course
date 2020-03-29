#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

#include "shell.h"
#include "msg.h"
#include "net/emcute.h"
#include "net/ipv6/addr.h"
#include "saul.h"
#include "saul_reg.h"
#include "phydat.h"

#define EMCUTE_PORT         (1883U)
#define EMCUTE_ID           ("gertrud")
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)

static char stack[THREAD_STACKSIZE_DEFAULT];
static msg_t queue[8];

//struct containing the sensors data
typedef struct sensors{
  int temperature;
  int humidity;
  int windDirection;
  int windIntensity;
  int rainHeight;
}t_sensors;

//emcute mqtt thread
static void *emcute_thread(void *arg){
    (void)arg;
    emcute_run(EMCUTE_PORT, EMCUTE_ID);
    return NULL;
}

//function for disconnecting from the mqttsn gateway
static int discon(void){
    int res = emcute_discon();
    if (res == EMCUTE_NOGW) {
        puts("error: not connected to any broker");
        return 1;
    }
    else if (res != EMCUTE_OK) {
        puts("error: unable to disconnect");
        return 1;
    }
    puts("Disconnect successful");
    return 0;
}

//function for publishing data
//the first argument is the string of the topic
//the second argument is the message to send
//the third argument is the QoS level
static int pub(char* topic, char* data, int qos){
  emcute_topic_t t;
  unsigned flags = EMCUTE_QOS_0;

  switch (qos) {
      case 1:
        flags |= EMCUTE_QOS_1;
        break;
      case 2:
        flags |= EMCUTE_QOS_2;
        break;
      default:
        flags |= EMCUTE_QOS_0;
        break;
  }



  //step 1: get topic id
  t.name = topic;
  if (emcute_reg(&t) != EMCUTE_OK) {
      puts("error: unable to obtain topic ID");
      return 1;
  }

  //step 2: publish data
  if (emcute_pub(&t, data, strlen(data), flags) != EMCUTE_OK) {
      printf("error: unable to publish data to topic '%s [%i]'\n",
              t.name, (int)t.id);
      return 1;
  }

  printf("published %s on topic %s\n", data, topic);

  return 0;
}

//function for connecting to the mqttsn gateway
//the first argument is the address the second is the port
static int con(char* addr, int port){
  sock_udp_ep_t gw = { .family = AF_INET6, .port = EMCUTE_PORT };
  gw.port = port;

  //parse address
  if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, addr) == NULL) {
      printf("error parsing IPv6 address\n");
      return 1;
  }

  if (emcute_con(&gw, true, NULL, NULL, 0, 0) != EMCUTE_OK) {
      printf("error: unable to connect to [%s]:%i\n", addr, port);
      return 1;
  }
  printf("Successfully connected to gateway at [%s]:%i\n", addr, port);
  return 0;
}

//function for generating random integer in [lower, upper]
static int rand_int(int lower, int upper) {
  return (rand() % (upper - lower + 1)) + lower;
}

//function for updating the sensor data
static void update_sensors(t_sensors* sensors){
  saul_reg_t* temp_dev = saul_reg_find_type(SAUL_SENSE_TEMP);
  phydat_t temp_data;
  saul_reg_read(temp_dev, &temp_data);
  float temp = temp_data.val;
  sensors->temperature = (int)round(temp/100);
  sensors->humidity = rand_int(0, 100);
  sensors->windDirection = rand_int(0, 360);
  sensors->windIntensity = rand_int(0, 100);
  sensors->rainHeight = rand_int(0, 50);
}

//enviromental station shell command
//it takes in input the address and the port of the gateway
//the id of the station and the seconds to pass between each publish
//it regularly updates the sensor data and publishes it to the topic
//stations/RiotOSEnvironmentalStation + the id of the station
static int cmd_env_station(int argc, char **argv){
  if (argc < 5) {
      printf("usage: %s <address> <port> <id> <seconds>\n", argv[0]);
      return 1;
  }

  char topic[64];
  sprintf(topic,"stations/IotLabEnvironmentalStation%d", atoi(argv[3]));

  t_sensors sensors;
  char data[128];

  while(1){
    if (con(argv[1], atoi(argv[2]))) {
      continue; //if it cannot connect it retries
    }

    update_sensors(&sensors);

    sprintf(data, "{\"temperature\": \"%d\", \"humidity\": \"%d\", \"windDirection\": \"%d\", "
                  "\"windIntensity\": \"%d\", \"rainHeight\": \"%d\"}",
                  sensors.temperature, sensors.humidity, sensors.windDirection,
                  sensors.windIntensity, sensors.rainHeight);

    if (pub(topic, data, 0)){
      discon(); //if it cannot publish it disconnects and restarts the loop
      continue;
    }

    discon();

    xtimer_sleep(atoi(argv[4]));
  }

  return 0;
}


static const shell_command_t shell_commands[] = {
    { "env_station", "Environmental station", cmd_env_station },
    { NULL, NULL, NULL }
};

int main(void){
    //the main thread needs a msg queue to be able to run `ping6`
    msg_init_queue(queue, (sizeof(queue) / sizeof(msg_t)));

    //start the emcute thread
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0,
                  emcute_thread, NULL, "emcute");

    //start shell
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);

    //should be never reached
    return 0;
}
